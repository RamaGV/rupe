// backend/src/estadisticas/organismo-perfil.controller.ts
//
// GET /organismos/:inciso/perfil — el espejo del perfil de empresa.
// Vive en estadisticas/ (cross-domain): codigueras no puede importar
// licitaciones sin crear un ciclo (licitaciones ya importa codigueras).
import { Controller, Get, NotFoundException, Param, ParseIntPipe } from '@nestjs/common';
import { LicitacionesService } from '../licitaciones/licitaciones.service';

@Controller('organismos')
export class OrganismoPerfilController {
  constructor(private readonly licitacionesService: LicitacionesService) {}

  @Get(':inciso/perfil')
  async perfil(@Param('inciso', ParseIntPipe) inciso: number) {
    const perfil = await this.licitacionesService.perfilOrganismo(inciso);
    if (perfil.totalLlamados === 0) {
      throw new NotFoundException(`No hay licitaciones del inciso ${inciso}`);
    }
    return perfil;
  }
}
