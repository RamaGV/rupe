// backend/src/alertas/alertas.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Alerta, AlertaSchema } from './schemas/alerta.schema';
import { Notificacion, NotificacionSchema } from './schemas/notificacion.schema';
import { AlertasService } from './alertas.service';
import { AlertasMatcherService } from './alertas-matcher.service';
import { NotificacionesService } from './notificaciones.service';
import { AlertasController } from './alertas.controller';
import { NotificacionesController } from './notificaciones.controller';

// Este módulo NO importa LicitacionesModule: el motor recibe los llamados
// nuevos como argumento (se los pasa la ingesta). La dependencia va en una
// sola dirección —licitaciones usa alertas— y no hay ciclo posible.
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Alerta.name, schema: AlertaSchema },
      { name: Notificacion.name, schema: NotificacionSchema },
    ]),
  ],
  controllers: [AlertasController, NotificacionesController],
  providers: [AlertasService, AlertasMatcherService, NotificacionesService],
  exports: [AlertasMatcherService],
})
export class AlertasModule {}
