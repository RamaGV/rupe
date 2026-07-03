// src/licitaciones/rss-scheduler.service.ts
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { RssIngestService } from './rss-ingest.service';

@Injectable()
export class RssSchedulerService implements OnModuleInit {
  private readonly logger = new Logger(RssSchedulerService.name);

  constructor(private readonly rssIngestService: RssIngestService) {}

  async onModuleInit() {
    this.logger.log('Ingesta inicial al arrancar el módulo...');
    await this.rssIngestService.ingestarRss();
  }

  // "0 */15 * * * *" = cada 15 minutos en cualquier hora/día
  @Cron('0 */15 * * * *')
  async ejecutarIngestaProgramada() {
    this.logger.log('Ejecutando ingesta programada del RSS...');
    const resultado = await this.rssIngestService.ingestarRss();
    this.logger.log(
      `Resultado: ${resultado.procesados} procesados, ${resultado.errores} errores`,
    );
  }
}