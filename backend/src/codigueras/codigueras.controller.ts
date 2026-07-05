// backend/src/codigueras/codigueras.controller.ts
import { Controller, Get } from '@nestjs/common';
import { CodiguerasService } from './codigueras.service';

// GET /organismos — la codiguera oficial (73 incisos) para poblar
// selectores en el frontend: elegir organismo por NOMBRE en vez de
// escribir el código de inciso a mano.
@Controller('organismos')
export class CodiguerasController {
  constructor(private readonly codiguerasService: CodiguerasService) {}

  @Get()
  listar() {
    return this.codiguerasService.listar();
  }
}
