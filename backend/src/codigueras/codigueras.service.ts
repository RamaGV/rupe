// backend/src/codigueras/codigueras.service.ts
//
// Lookup de incisos por nombre: el paso de enriquecimiento que el parser
// del RSS dejaba anotado ("inciso: 0, se resuelve en un paso posterior").
//
// La colección de organismos son 73 documentos que cambian un puñado de
// veces por año: se cargan UNA vez a un Map en memoria al iniciar el
// módulo. El lookup es sincrónico y O(1) — importa porque corre por cada
// item del RSS, en cada corrida del cron.
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  OrganismoCodiguera,
  OrganismoCodigueraDocument,
} from './schemas/organismo-codiguera.schema';
import { normalizarNombreOrganismo } from './parsers/codigueras-xml.parser';

@Injectable()
export class CodiguerasService implements OnModuleInit {
  private readonly logger = new Logger(CodiguerasService.name);
  private incisoPorNombre = new Map<string, number>();

  constructor(
    @InjectModel(OrganismoCodiguera.name)
    private readonly organismoModel: Model<OrganismoCodigueraDocument>,
  ) {}

  // Nest espera este async antes de inicializar los módulos que importan
  // a éste — el scheduler del RSS (que ingesta al arrancar) ve el mapa cargado.
  async onModuleInit(): Promise<void> {
    await this.recargar();
  }

  async recargar(): Promise<void> {
    const organismos = await this.organismoModel
      .find({}, { nombreNormalizado: 1, inciso: 1 })
      .lean();

    this.incisoPorNombre = new Map(
      organismos.map((o) => [o.nombreNormalizado, o.inciso]),
    );

    if (this.incisoPorNombre.size === 0) {
      this.logger.warn(
        'La colección de organismos está vacía: los llamados del RSS quedarán ' +
          'con inciso 0. Correr: npm run ingesta:codigueras',
      );
    } else {
      this.logger.log(`Codiguera de incisos en memoria: ${this.incisoPorNombre.size}`);
    }
  }

  // Devuelve 0 si no hay match — el mismo "no sé" que ya usa el dominio.
  // Es un resultado legítimo: las UCC/UACM (compras centralizadas de ASSE,
  // ARCE...) aparecen en el RSS pero NO son un inciso (9 de 929 en la
  // auditoría; el resto matchea).
  resolverInciso(nombreOrganismo: string): number {
    return this.incisoPorNombre.get(normalizarNombreOrganismo(nombreOrganismo)) ?? 0;
  }
}
