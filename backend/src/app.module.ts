// src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { LicitacionesModule } from './licitaciones/licitaciones.module';
import { ProveedoresModule } from './proveedores/proveedores.module';
import { AlertasModule } from './alertas/alertas.module';
import { EstadisticasModule } from './estadisticas/estadisticas.module';
import { PushModule } from './push/push.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '../.env',
    }),
    DatabaseModule,
    ProveedoresModule,
    LicitacionesModule,
    AlertasModule,
    EstadisticasModule,
    PushModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}