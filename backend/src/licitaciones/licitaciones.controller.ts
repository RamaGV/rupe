// src/licitaciones/licitaciones.controller.ts
import { Controller, Get, Param, Query } from '@nestjs/common';
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