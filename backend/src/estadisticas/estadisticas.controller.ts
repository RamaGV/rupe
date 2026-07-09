// backend/src/estadisticas/estadisticas.controller.ts
import { Controller, Get, Query, ParseIntPipe } from '@nestjs/common';
import { LicitacionesService } from '../licitaciones/licitaciones.service';
import { ProveedoresService } from '../proveedores/proveedores.service';
import { CacheCalculosService } from './cache-calculos.service';

@Controller('estadisticas')
export class EstadisticasController {
  constructor(
    private readonly licitacionesService: LicitacionesService,
    private readonly proveedoresService: ProveedoresService,
    private readonly cache: CacheCalculosService,
  ) {}

  // GET /estadisticas            → histórico completo
  // GET /estadisticas?anio=2026  → solo ese año ("este año" del dashboard)
  // Un solo param opcional: ParseIntPipe alcanza, un DTO sería ceremonia.
  // "la semana en compras públicas" — también el futuro cuerpo del email
  @Get('semana')
  resumenSemanal() {
    return this.cache.obtener('semana', () => this.licitacionesService.resumenSemanal());
  }

  @Get()
  async resumen(@Query('anio', new ParseIntPipe({ optional: true })) anio?: number) {
    const [licitaciones, proveedores] = await Promise.all([
      this.cache.obtener(`estadisticas:${anio ?? 'todo'}`, () =>
        this.licitacionesService.estadisticasGenerales(anio),
      ),
      // buscar con limit 1 solo por el total: el contrato del repositorio
      // no tiene contar() y agregarlo para un único consumidor no lo
      // amerita (si aparece otro, se promueve al contrato).
      this.proveedoresService.buscar({ page: 1, limit: 1 }),
    ]);

    return { ...licitaciones, totalProveedores: proveedores.total };
  }
}
