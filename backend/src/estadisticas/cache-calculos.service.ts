// backend/src/estadisticas/cache-calculos.service.ts
//
// Los cálculos del dashboard/banderas recorren ~600k documentos: con el
// histórico completo cargado, hacerlos EN CADA visita es lo que el autor
// notó como lentitud. Se calculan una vez y se sirven desde memoria con
// TTL de 10 minutos (los datos cambian, como mucho, cada corrida del
// cron del RSS). Warm-up al arrancar: el primer visitante no paga.
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { LicitacionesService } from '../licitaciones/licitaciones.service';

const TTL_MS = 10 * 60 * 1000;

@Injectable()
export class CacheCalculosService implements OnModuleInit {
  private readonly logger = new Logger(CacheCalculosService.name);
  private cache = new Map<string, { data: unknown; exp: number }>();

  constructor(private readonly licitacionesService: LicitacionesService) {}

  // fire-and-forget: no bloquea el arranque de la app
  onModuleInit(): void {
    const anio = new Date().getFullYear();
    void this.obtener(`estadisticas:${anio}`, () =>
      this.licitacionesService.estadisticasGenerales(anio),
    ).then(() => this.logger.log('Estadísticas del año pre-calculadas'));
    void this.obtener('estadisticas:todo', () =>
      this.licitacionesService.estadisticasGenerales(),
    ).then(() => this.logger.log('Estadísticas históricas pre-calculadas'));
    void this.obtener('banderas', () => this.licitacionesService.banderasRojas());
  }

  async obtener<T>(clave: string, calcular: () => Promise<T>): Promise<T> {
    const hit = this.cache.get(clave);
    if (hit && hit.exp > Date.now()) return hit.data as T;
    const data = await calcular();
    this.cache.set(clave, { data, exp: Date.now() + TTL_MS });
    return data;
  }
}
