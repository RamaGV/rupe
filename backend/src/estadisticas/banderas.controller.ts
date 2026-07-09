// backend/src/estadisticas/banderas.controller.ts
import { Controller, Get } from '@nestjs/common';
import { LicitacionesService } from '../licitaciones/licitaciones.service';

// Señales estadísticas para mirar dos veces — no acusaciones.
@Controller('banderas-rojas')
export class BanderasController {
  constructor(private readonly licitacionesService: LicitacionesService) {}

  @Get()
  banderas() {
    return this.licitacionesService.banderasRojas();
  }
}
