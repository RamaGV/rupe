// backend/src/scripts/ingesta-proveedores.ts
//
// Script batch standalone: carga los CSV mensuales de RUPE
// (backend/data/rupe/*.csv) a la colección de proveedores en Mongo.
//   npm run ingesta:proveedores
//
// Reusa parsearFilaRupe (el MISMO parser que usaba el adaptador CSV:
// la fuente no cambió, cambió dónde vive el resultado) y upsertea por
// numeroDocumento en lotes — correr el script dos veces no duplica.
import { NestFactory } from '@nestjs/core';
import { Module, Logger, Injectable } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule, InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { parse } from 'csv-parse/sync';
import { readFileSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';
import { DatabaseModule } from '../database/database.module';
import { Proveedor, ProveedorSchema, ProveedorDocument } from '../ingesta/schemas/proveedor.schema';
import { parsearFilaRupe, FilaCsvRupe } from '../ingesta/parsers/rupe-csv.parser';

const TAMANIO_LOTE = 1000;

@Injectable()
class ProveedoresCsvAMongoService {
  private readonly logger = new Logger(ProveedoresCsvAMongoService.name);
  private readonly dataDir = join(process.cwd(), 'data', 'rupe');

  constructor(
    @InjectModel(Proveedor.name)
    private readonly proveedorModel: Model<ProveedorDocument>,
  ) {}

  async ingestar(): Promise<{ procesados: number; archivos: number }> {
    const archivos = readdirSync(this.dataDir).filter((f) => f.endsWith('.csv'));
    if (archivos.length === 0) {
      throw new Error(`No hay CSVs en ${this.dataDir}`);
    }

    let procesados = 0;
    for (const archivo of archivos) {
      // latin1 + ';' + trim: los vicios conocidos del CSV de RUPE
      const contenido = readFileSync(join(this.dataDir, archivo), 'latin1');
      const filas: FilaCsvRupe[] = parse(contenido, {
        columns: true,
        delimiter: ';',
        skip_empty_lines: true,
        trim: true,
      });

      for (let i = 0; i < filas.length; i += TAMANIO_LOTE) {
        const lote = filas.slice(i, i + TAMANIO_LOTE).map((fila) => {
          const proveedor = parsearFilaRupe(fila, `file://${archivo}`);
          return {
            updateOne: {
              filter: { numeroDocumento: proveedor.numeroDocumento },
              update: { $set: proveedor },
              upsert: true,
            },
          };
        });
        await this.proveedorModel.bulkWrite(lote);
        procesados += lote.length;
      }
      this.logger.log(`${archivo}: ${filas.length} filas`);
    }

    return { procesados, archivos: archivos.length };
  }
}

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '../.env' }),
    DatabaseModule,
    MongooseModule.forFeature([{ name: Proveedor.name, schema: ProveedorSchema }]),
  ],
  providers: [ProveedoresCsvAMongoService],
})
class IngestaProveedoresModule {}

async function main() {
  const logger = new Logger('IngestaProveedores');
  const dataDir = join(process.cwd(), 'data', 'rupe');
  if (!existsSync(dataDir)) {
    logger.error(`No existe ${dataDir} — bajar el CSV mensual de RUPE ahí`);
    process.exit(1);
  }

  const app = await NestFactory.createApplicationContext(IngestaProveedoresModule, {
    logger: ['log', 'warn', 'error'],
  });

  try {
    const inicio = Date.now();
    const stats = await app.get(ProveedoresCsvAMongoService).ingestar();
    const segundos = ((Date.now() - inicio) / 1000).toFixed(1);
    logger.log(
      `Listo en ${segundos}s: ${stats.procesados} proveedores de ${stats.archivos} archivo(s)`,
    );
  } finally {
    await app.close();
  }
}

void main();
