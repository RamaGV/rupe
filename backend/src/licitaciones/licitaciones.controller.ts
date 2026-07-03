// src/licitaciones/licitaciones.controller.ts
import { Controller, Get, Param, Query } from '@nestjs/common';
import { LicitacionesService } from './licitaciones.service';
import { RssIngestService } from './rss-ingest.service';

@Controller('licitaciones')
export class LicitacionesController {
  constructor(
    private readonly licitacionesService: LicitacionesService,
    private readonly rssIngestService: RssIngestService,
  ) {}

  @Get()
  buscar(
    @Query('tipo') tipo?: string,
    @Query('inciso') inciso?: string,
    @Query('texto') texto?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.licitacionesService.buscar({
      tipo,
      inciso: inciso ? parseInt(inciso, 10) : undefined,
      texto,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get(':id')
  buscarPorId(@Param('id') id: string) {
    return this.licitacionesService.buscarPorId(id);
  }

  // Endpoint de debug para disparar la ingesta a mano sin esperar
  // el cron - muy útil mientras probás el parser. Sacalo o
  // protegelo con un guard antes de ir a producción.
  @Get('debug/ingestar-ahora')
  ingestarAhora() {
    return this.rssIngestService.ingestarRss();
  }
}