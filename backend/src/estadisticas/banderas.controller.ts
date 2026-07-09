// backend/src/estadisticas/banderas.controller.ts
import { Controller, Get } from '@nestjs/common';
import { LicitacionesService } from '../licitaciones/licitaciones.service';
import { CacheCalculosService } from './cache-calculos.service';

// Señales estadísticas para mirar dos veces — no acusaciones.
@Controller('banderas-rojas')
export class BanderasController {
  constructor(
    private readonly licitacionesService: LicitacionesService,
    private readonly cache: CacheCalculosService,
  ) {}

  @Get()
  banderas() {
    return this.cache.obtener('banderas', () => this.licitacionesService.banderasRojas());
  }
}
