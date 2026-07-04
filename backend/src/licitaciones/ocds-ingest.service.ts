// src/licitaciones/ocds-ingest.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import AdmZip from 'adm-zip';
import { Licitacion, LicitacionDocument } from './schemas/licitacion.schema';
import {
  mapearTenderALicitacion,
  mapearAwardALicitacion,
} from './parsers/ocds-release.parser';
import type { OcdsRelease } from './parsers/ocds-release.parser';
import { TipoContratacion } from '../shared/types/enums';

export interface ResultadoIngestaOcds {
  archivos: number;
  llamados: number;
  adjudicaciones: number;
  errores: number;
}

// Cuántas operaciones acumulamos antes de mandarlas juntas a Mongo.
// Un dump anual trae ~145k releases: hacer 145k findOneAndUpdate uno
// por uno (como el RSS, que trae ~900) tardaría una eternidad en
// round-trips. bulkWrite manda lotes enteros en un solo viaje.
const TAMANIO_LOTE = 1000;

@Injectable()
export class OcdsIngestService {
  private readonly logger = new Logger(OcdsIngestService.name);

  constructor(
    @InjectModel(Licitacion.name)
    private readonly licitacionModel: Model<LicitacionDocument>,
  ) {}

  async ingestarDesdeZip(rutaZip: string): Promise<ResultadoIngestaOcds> {
    this.logger.log(`Leyendo ${rutaZip}...`);
    const zip = new AdmZip(rutaZip);

    // Orden importa: primero TODOS los llamados (l-01..l-12), después las
    // adjudicaciones (a-01..a-12), así el award encuentra su llamado ya
    // creado y solo lo enriquece. Dentro de cada grupo, por mes.
    const entradas = zip
      .getEntries()
      .filter((e) => e.entryName.endsWith('.json'))
      .sort((a, b) => this.claveOrden(a.entryName).localeCompare(this.claveOrden(b.entryName)));

    const stats: ResultadoIngestaOcds = {
      archivos: 0,
      llamados: 0,
      adjudicaciones: 0,
      errores: 0,
    };

    for (const entrada of entradas) {
      const paquete = JSON.parse(entrada.getData().toString('utf8')) as {
        releases: OcdsRelease[];
      };
      const resultado = await this.procesarReleases(paquete.releases, entrada.entryName);
      stats.archivos++;
      stats.llamados += resultado.llamados;
      stats.adjudicaciones += resultado.adjudicaciones;
      stats.errores += resultado.errores;
      this.logger.log(
        `${entrada.entryName}: ${resultado.llamados} llamados, ` +
          `${resultado.adjudicaciones} adjudicaciones, ${resultado.errores} errores`,
      );
    }

    this.logger.log(
      `Ingesta OCDS completa: ${stats.llamados} llamados, ` +
        `${stats.adjudicaciones} adjudicaciones, ${stats.errores} errores en ${stats.archivos} archivos`,
    );
    return stats;
  }

  // "2025/l-03-2025.json" → "0-03" / "2025/a-03-2025.json" → "1-03"
  private claveOrden(nombre: string): string {
    return nombre
      .replace(/^.*\//, '')
      .replace(/^l-/, '0-')
      .replace(/^a-/, '1-');
  }

  private async procesarReleases(
    releases: OcdsRelease[],
    archivo: string,
  ): Promise<{ llamados: number; adjudicaciones: number; errores: number }> {
    let llamados = 0;
    let adjudicaciones = 0;
    let errores = 0;
    // "any" acá: el tipo de bulkWrite de Mongoose es demasiado estricto
    // con $setOnInsert dinámico; el shape real está validado por los tests
    let ops: any[] = [];

    const flush = async () => {
      if (ops.length === 0) return;
      // ordered:false → si una op falla, las demás del lote siguen
      // (mismo principio de resiliencia que la ingesta del RSS)
      const res = await this.licitacionModel.bulkWrite(ops, { ordered: false });
      void res;
      ops = [];
    };

    for (const release of releases) {
      try {
        const tags = release.tag ?? [];

        if (tags.some((t) => t.startsWith('tender'))) {
          const doc = this.sinUndefined(mapearTenderALicitacion(release));
          ops.push({
            updateOne: {
              filter: { id: doc.id },
              // $setOnInsert también acá: un tender sin buyer no trae
              // organismo (sería pisar con vacío) — pero si este release
              // CREA el doc, los mínimos garantizan el shape completo.
              update: {
                $set: doc,
                $setOnInsert: this.minimosParaInsertar(release, doc),
              },
              upsert: true,
            },
          });
          llamados++;
        } else if (tags.some((t) => t.startsWith('award'))) {
          const patch = this.sinUndefined(mapearAwardALicitacion(release));
          ops.push({
            updateOne: {
              filter: { id: patch.id },
              // $set: lo que el award sabe. $setOnInsert: mínimos para
              // que un award cuyo llamado no está en la base (ej: llamado
              // de 2024 adjudicado en 2025) cree un doc válido igual.
              update: {
                $set: patch,
                $setOnInsert: this.minimosParaInsertar(release, patch),
              },
              upsert: true,
            },
          });
          adjudicaciones++;
        }
        // tags desconocidos se ignoran en silencio: OCDS permite
        // extensiones y no queremos abortar por un tag nuevo

        if (ops.length >= TAMANIO_LOTE) await flush();
      } catch (err) {
        errores++;
        if (errores <= 5) {
          this.logger.warn(`${archivo} release "${release?.id}": ${err.message}`);
        }
      }
    }
    await flush();

    if (errores > 5) {
      this.logger.warn(`${archivo}: ${errores - 5} errores más (silenciados)`);
    }
    return { llamados, adjudicaciones, errores };
  }

  // Mongo interpreta { campo: undefined } como "seteá null" — hay que
  // eliminar las claves undefined para que un tenderUpdate parcial no
  // pise datos ya guardados.
  private sinUndefined<T extends Record<string, unknown>>(obj: T): T {
    return Object.fromEntries(
      Object.entries(obj).filter(([, v]) => v !== undefined),
    ) as T;
  }

  // Valores por defecto SOLO si el upsert crea el documento (el llamado
  // no existía en la base). Claves disjuntas de $set para que Mongo no
  // proteste por conflicto.
  private minimosParaInsertar(
    release: OcdsRelease,
    patch: Record<string, unknown>,
  ): Record<string, unknown> {
    const minimos: Record<string, unknown> = {
      numeroCompra: '',
      anio: new Date(release.date).getFullYear(),
      tipo: TipoContratacion.PROCEDIMIENTO_ESPECIAL,
      aperturaElectronica: false,
      descripcion: '',
      fechaPublicacion: new Date(release.date),
      // si el release que crea el doc no trae buyer (los mapeos devuelven
      // organismo undefined para no pisar), el doc nace con el 0 honesto
      organismo: { inciso: 0, nombreInciso: '', unidadEjecutora: '' },
    };
    // nunca repetir claves que ya van en $set
    for (const clave of Object.keys(patch)) delete minimos[clave];
    return minimos;
  }
}
