// src/proveedores/proveedores.controller.ts
import { Controller, Get, Param, Query, NotFoundException } from '@nestjs/common';
import { ProveedoresService } from './proveedores.service';

@Controller('proveedores')
export class ProveedoresController {
  constructor(private readonly proveedoresService: ProveedoresService) {}

  // GET /proveedores?page=2&limit=20&texto=constructora
  // Los query params llegan como string: parseamos a mano con defaults.
  // (Bloque 3 pendiente: DTOs con class-validator para validar de verdad)
  @Get()
  buscar(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('texto') texto?: string,
  ) {
    return this.proveedoresService.buscar({
      page: Math.max(parseInt(page ?? '1', 10) || 1, 1),
      limit: Math.min(Math.max(parseInt(limit ?? '20', 10) || 20, 1), 100),
      texto,
    });
  }

  // Perfil enriquecido: identidad RUPE + historial de adjudicaciones.
  // Declarado ANTES de ':documento' por prolijidad con rutas paramétricas.
  @Get(':documento/perfil')
  async getPerfil(@Param('documento') documento: string) {
    const perfil = await this.proveedoresService.getPerfil(documento);
    if (!perfil) {
      throw new NotFoundException(
        `No hay datos del proveedor ${documento} (ni en RUPE ni en adjudicaciones)`,
      );
    }
    return perfil;
  }

  @Get(':documento')
  async findOne(@Param('documento') documento: string) {
    const proveedor = await this.proveedoresService.findByDocumento(documento);
    if (!proveedor) {
      throw new NotFoundException(`Proveedor con documento ${documento} no encontrado`);
    }
    return proveedor;
  }
}