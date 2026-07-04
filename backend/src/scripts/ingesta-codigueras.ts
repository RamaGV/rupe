// backend/src/scripts/ingesta-codigueras.ts
//
// Script batch standalone: descarga las codigueras de incisos y unidades
// ejecutoras de ARCE, las upsertea en Mongo y hace backfill de las
// licitaciones que quedaron con organismo.inciso 0 (las que ingresaron
// por RSS antes de tener la codiguera).
//   npm run ingesta:codigueras
//
// Mismo patrón que ingesta-ocds.ts: createApplicationContext con módulo
// propio que NO importa LicitacionesModule (dispararía el scheduler del RSS).
import { NestFactory } from '@nestjs/core';
import { Module, Logger } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule, InjectModel } from '@nestjs/mongoose';
import { Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import { DatabaseModule } from '../database/database.module';
import {
  OrganismoCodiguera,
  OrganismoCodigueraSchema,
  OrganismoCodigueraDocument,
} from '../codigueras/schemas/organismo-codiguera.schema';
import { CodiguerasIngestService } from '../codigueras/codigueras-ingest.service';
import { normalizarNombreOrganismo } from '../codigueras/parsers/codigueras-xml.parser';
import { Licitacion, LicitacionSchema, LicitacionDocument } from '../licitaciones/schemas/licitacion.schema';

// El backfill vive en el script (no en CodiguerasModule): tocar la
// colección de licitaciones es una corrección puntual de datos viejos,
// no una responsabilidad del módulo de codigueras.
@Injectable()
class BackfillIncisosService {
  private readonly logger = new Logger(BackfillIncisosService.name);

  constructor(
    @InjectModel(OrganismoCodiguera.name)
    private readonly organismoModel: Model<OrganismoCodigueraDocument>,
    @InjectModel(Licitacion.name)
    private readonly licitacionModel: Model<LicitacionDocument>,
  ) {}

  async corregirIncisosCero(): Promise<{ corregidas: number; sinMatch: number }> {
    const organismos = await this.organismoModel
      .find({}, { nombreNormalizado: 1, inciso: 1 })
      .lean();
    const incisoPorNombre = new Map(
      organismos.map((o) => [o.nombreNormalizado, o.inciso]),
    );

    const pendientes = await this.licitacionModel
      .find({ 'organismo.inciso': 0 }, { id: 1, 'organismo.nombreInciso': 1 })
      .lean();

    const operaciones: {
      updateOne: { filter: { id: string }; update: { $set: { 'organismo.inciso': number } } };
    }[] = [];
    let sinMatch = 0;
    for (const lic of pendientes) {
      const inciso = incisoPorNombre.get(
        normalizarNombreOrganismo(lic.organismo.nombreInciso),
      );
      if (inciso === undefined) {
        sinMatch++; // UCC/UACM: no son un inciso, el 0 es correcto
        continue;
      }
      operaciones.push({
        updateOne: {
          filter: { id: lic.id },
          update: { $set: { 'organismo.inciso': inciso } },
        },
      });
    }

    if (operaciones.length > 0) {
      await this.licitacionModel.bulkWrite(operaciones);
    }
    this.logger.log(
      `Backfill: ${operaciones.length} licitaciones corregidas, ` +
        `${sinMatch} sin match (compras centralizadas, quedan en 0)`,
    );
    return { corregidas: operaciones.length, sinMatch };
  }
}

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '../.env' }),
    DatabaseModule,
    MongooseModule.forFeature([
      { name: OrganismoCodiguera.name, schema: OrganismoCodigueraSchema },
      { name: Licitacion.name, schema: LicitacionSchema },
    ]),
  ],
  providers: [CodiguerasIngestService, BackfillIncisosService],
})
class IngestaCodiguerasModule {}

async function main() {
  const logger = new Logger('IngestaCodigueras');
  const app = await NestFactory.createApplicationContext(IngestaCodiguerasModule, {
    logger: ['log', 'warn', 'error'],
  });

  try {
    const stats = await app.get(CodiguerasIngestService).ingestarCodigueras();
    const backfill = await app.get(BackfillIncisosService).corregirIncisosCero();
    logger.log(
      `Listo: ${stats.incisos} incisos, ${stats.unidadesEjecutoras} UEs, ` +
        `${backfill.corregidas} licitaciones backfilleadas`,
    );
  } finally {
    await app.close();
  }
}

void main();
