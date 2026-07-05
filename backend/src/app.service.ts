// src/app.service.ts
import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

export interface EstadoSalud {
  status: 'ok' | 'degradado';
  mongo: 'ok' | 'sin conexion';
  timestamp: string;
  version: string;
}

@Injectable()
export class AppService {
  constructor(@InjectConnection() private readonly connection: Connection) {}

  // Un health check que no verifica sus dependencias es un "el proceso
  // está vivo": mentía "ok" con Mongo caído. Ahora hace un PING real —
  // readyState solo no alcanza (puede decir "conectado" mientras el
  // socket agoniza) — con timeout corto: el health check nunca debe
  // colgarse él mismo esperando a la dependencia que diagnostica.
  async getHealth(): Promise<EstadoSalud> {
    let mongo: EstadoSalud['mongo'] = 'sin conexion';
    try {
      if (this.connection.readyState === 1 && this.connection.db) {
        await Promise.race([
          this.connection.db.admin().ping(),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('ping timeout')), 2000),
          ),
        ]);
        mongo = 'ok';
      }
    } catch {
      // mongo queda 'sin conexion': el catch ES el diagnóstico
    }

    return {
      status: mongo === 'ok' ? 'ok' : 'degradado',
      mongo,
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    };
  }
}
