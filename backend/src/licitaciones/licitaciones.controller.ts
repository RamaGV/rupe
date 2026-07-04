// src/licitaciones/licitaciones.controller.ts
import { Controller, Get, Param, Query, NotFoundException } from '@nestjs/common';
import { LicitacionesService } from './licitaciones.service';
import { RssIngestService } from './rss-ingest.service';
import { BuscarLicitacionesDto } from './dto/buscar-licitaciones.dto';

@Controller('licitaciones')
export class LicitacionesController {
  constructor(
    private readonly licitacionesService: LicitacionesService,
    private readonly rssIngestService: RssIngestService,
  ) {}

  // Todo el parseo/validación de la query vive en el DTO + ValidationPipe
  // global: acá llega un objeto ya tipado, convertido y con defaults.
  // Comparar con la versión anterior: 5 @Query() sueltos y parseInt a mano.
  @Get()
  buscar(@Query() filtros: BuscarLicitacionesDto) {
    return this.licitacionesService.buscar(filtros);
  }

  // Antes devolvía 200 con null si no existía — un cliente tenía que
  // chequear el body para saber si encontró algo. 404 es el contrato
  // correcto de REST, y el exception filter le da la forma estándar.
  @Get(':id')
  async buscarPorId(@Param('id') id: string) {
    const licitacion = await this.licitacionesService.buscarPorId(id);
    if (!licitacion) {
      throw new NotFoundException(`No existe la licitación con id "${id}"`);
    }
    return licitacion;
  }

  // Endpoint de debug para disparar la ingesta a mano sin esperar
  // el cron - muy útil mientras probás el parser. Sacalo o
  // protegelo con un guard antes de ir a producción.
  @Get('debug/ingestar-ahora')
  ingestarAhora() {
    return this.rssIngestService.ingestarRss();
  }
}