// backend/src/scripts/ingesta-ocds.ts
//
// Script batch standalone: ingesta un dump OCDS anual a Mongo.
//   npm run ingesta:ocds            → usa data/ocds/ocds-2025.zip
//   npm run ingesta:ocds -- 2024    → usa data/ocds/ocds-2024.zip
//
// Usa NestFactory.createApplicationContext: levanta el contenedor de
// inyección de dependencias de Nest SIN servidor HTTP. Es el patrón
// estándar para jobs batch/CLI: mismo ecosistema (ConfigModule, Mongoose,
// DI), cero Express.
import { NestFactory } from '@nestjs/core';
import { Module, Logger } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { existsSync } from 'fs';
import { resolve } from 'path';
import { DatabaseModule } from '../database/database.module';
import { Licitacion, LicitacionSchema } from '../licitaciones/schemas/licitacion.schema';
import { OcdsIngestService } from '../licitaciones/ocds-ingest.service';

// Módulo propio del script: ensambla SOLO lo que el batch necesita.
// A propósito NO importa LicitacionesModule — ese módulo carga
// RssSchedulerService, que dispararía la ingesta del RSS al arrancar.
// Composición de módulos: cada punto de entrada arma su propio grafo.
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '../.env' }),
    DatabaseModule,
    MongooseModule.forFeature([{ name: Licitacion.name, schema: LicitacionSchema }]),
  ],
  providers: [OcdsIngestService],
})
class IngestaOcdsModule {}

async function main() {
  const logger = new Logger('IngestaOcds');
  const anio = process.argv[2] ?? '2025';
  const rutaZip = resolve(process.cwd(), 'data', 'ocds', `ocds-${anio}.zip`);

  if (!existsSync(rutaZip)) {
    logger.error(`No existe ${rutaZip}`);
    logger.error(
      'Descargalo del dataset "Datos Históricos de Compras" en catalogodatos.gub.uy',
    );
    process.exit(1);
  }

  const app = await NestFactory.createApplicationContext(IngestaOcdsModule, {
    logger: ['log', 'warn', 'error'],
  });

  try {
    const servicio = app.get(OcdsIngestService);
    const inicio = Date.now();
    const stats = await servicio.ingestarDesdeZip(rutaZip);
    const segundos = ((Date.now() - inicio) / 1000).toFixed(1);
    logger.log(
      `Listo en ${segundos}s: ${stats.llamados} llamados, ` +
        `${stats.adjudicaciones} adjudicaciones, ${stats.errores} errores`,
    );
  } finally {
    // cerrar la conexión a Mongo para que el proceso termine solo
    await app.close();
  }
}

void main();
