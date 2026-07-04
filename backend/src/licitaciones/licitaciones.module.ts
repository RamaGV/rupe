// src/licitaciones/licitaciones.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { CodiguerasModule } from '../codigueras/codigueras.module';
import { AlertasModule } from '../alertas/alertas.module';
import { Licitacion, LicitacionSchema } from './schemas/licitacion.schema';
import { RssIngestService } from './rss-ingest.service';
import { RssSchedulerService } from './rss-scheduler.service';
import { VencimientosSchedulerService } from './vencimientos-scheduler.service';
import { LicitacionesController } from './licitaciones.controller';
import { LicitacionesService } from './licitaciones.service';

@Module({
  imports: [
    // Registra el schema Licitacion en este módulo - a partir de
    // aca @InjectModel(Licitacion.name) funciona en cualquier
    // provider declarado abajo.
    MongooseModule.forFeature([
      { name: Licitacion.name, schema: LicitacionSchema },
    ]),
    // ScheduleModule.forRoot() habilita los decoradores @Cron.
    // Lo importamos aca (no en AppModule) porque es el único
    // módulo que por ahora usa cron jobs.
    ScheduleModule.forRoot(),
    // Codiguera de incisos: el enriquecimiento nombre → inciso de la
    // ingesta RSS. Nest inicializa los módulos importados primero, así
    // que el mapa en memoria está cargado antes de la ingesta al arrancar.
    CodiguerasModule,
    // El motor de alertas: la ingesta le pasa los llamados NUEVOS.
    // La dependencia va en una sola dirección (alertas no sabe de
    // licitaciones), así que no hay ciclo.
    AlertasModule,
  ],
  controllers: [LicitacionesController],
  providers: [
    RssIngestService,
    RssSchedulerService,
    VencimientosSchedulerService,
    LicitacionesService,
  ],
  // Exportamos el service para que otros módulos (ej: Alertas, más
  // adelante) puedan consultar licitaciones sin duplicar lógica.
  exports: [LicitacionesService],
})
export class LicitacionesModule {}