// backend/src/codigueras/codigueras-ingest.service.ts
//
// Ingesta de las codigueras de incisos y unidades ejecutoras.
// Se ejecuta desde el script batch (npm run ingesta:codigueras), NO desde
// la app: las codigueras cambian un puñado de veces por año. Mismo patrón
// que OcdsIngestService: este service no está en el grafo de la app.
import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  OrganismoCodiguera,
  OrganismoCodigueraDocument,
} from './schemas/organismo-codiguera.schema';
import {
  parsearIncisosXml,
  parsearUnidadesEjecutorasXml,
  normalizarNombreOrganismo,
} from './parsers/codigueras-xml.parser';

// Las codigueras las sirve el MISMO host que el RSS (sin los problemas
// TLS de catalogodatos.gub.uy, que solo publica el catálogo con los links).
const URL_INCISOS =
  'http://www.comprasestatales.gub.uy/comprasenlinea/jboss/reporteIncisos.do';
const URL_UNIDADES =
  'http://www.comprasestatales.gub.uy/comprasenlinea/jboss/reporteUnidadesEjecutoras.do';

@Injectable()
export class CodiguerasIngestService {
  private readonly logger = new Logger(CodiguerasIngestService.name);

  constructor(
    @InjectModel(OrganismoCodiguera.name)
    private readonly organismoModel: Model<OrganismoCodigueraDocument>,
  ) {}

  async ingestarCodigueras(): Promise<{ incisos: number; unidadesEjecutoras: number }> {
    this.logger.log('Descargando codigueras de ARCE...');
    const [xmlIncisos, xmlUnidades] = await Promise.all([
      this.descargarLatin1(URL_INCISOS),
      this.descargarLatin1(URL_UNIDADES),
    ]);

    const incisos = parsearIncisosXml(xmlIncisos);
    const unidades = parsearUnidadesEjecutorasXml(xmlUnidades);

    // Agrupamos las UEs por inciso para armar el documento embebido
    const uesPorInciso = new Map<number, typeof unidades>();
    for (const ue of unidades) {
      const lista = uesPorInciso.get(ue.inciso) ?? [];
      lista.push(ue);
      uesPorInciso.set(ue.inciso, lista);
    }

    const operaciones = incisos.map((i) => ({
      updateOne: {
        filter: { inciso: i.codigo },
        update: {
          $set: {
            inciso: i.codigo,
            nombre: i.nombre,
            nombreNormalizado: normalizarNombreOrganismo(i.nombre),
            unidadesEjecutoras: (uesPorInciso.get(i.codigo) ?? []).map(
              ({ codigo, nombre, vigente }) => ({ codigo, nombre, vigente }),
            ),
            fechaIngesta: new Date(),
          },
        },
        upsert: true,
      },
    }));

    await this.organismoModel.bulkWrite(operaciones);
    this.logger.log(
      `Codigueras ingestadas: ${incisos.length} incisos, ${unidades.length} unidades ejecutoras`,
    );
    return { incisos: incisos.length, unidadesEjecutoras: unidades.length };
  }

  // El servidor responde ISO-8859-1 (mismo vicio que el CSV de RUPE):
  // response.text() asumiría UTF-8 y rompería todas las tildes, así
  // que decodificamos los bytes crudos como latin1.
  private async descargarLatin1(url: string): Promise<string> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`La codiguera ${url} respondió ${response.status}`);
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    return buffer.toString('latin1');
  }
}
