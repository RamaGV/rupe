// src/licitaciones/rss-ingest.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { XMLParser } from 'fast-xml-parser';
import { Licitacion, LicitacionDocument } from './schemas/licitacion.schema';
import { mapearItemALicitacion } from './parsers/rss-llamado.parser';
import type { RssItemRaw, LlamadoParseado } from './parsers/rss-llamado.parser';
import { CodiguerasService } from '../codigueras/codigueras.service';
import { AlertasMatcherService } from '../alertas/alertas-matcher.service';

// URL base del RSS de llamados vigentes. Los parámetros de la URL
// (tipo-pub, rango-fecha, etc.) los agregamos en un servicio aparte
// más adelante cuando armemos el feed personalizado por cliente.
const RSS_URL = 'https://www.comprasestatales.gub.uy/consultas/rss';

@Injectable()
export class RssIngestService {
  private readonly logger = new Logger(RssIngestService.name);
  private readonly xmlParser = new XMLParser({
    ignoreAttributes: false,
    trimValues: true,
  });

  constructor(
    @InjectModel(Licitacion.name)
    private readonly licitacionModel: Model<LicitacionDocument>,
    private readonly codiguerasService: CodiguerasService,
    private readonly alertasMatcher: AlertasMatcherService,
  ) {}

  // Punto de entrada: se llama desde el scheduler (paso siguiente)
  // o manualmente desde un endpoint de debug.
  async ingestarRss(): Promise<{ procesados: number; errores: number; nuevos: number }> {
    this.logger.log('Iniciando ingesta del RSS de ARCE...');

    const xml = await this.descargarRss();
    const items = this.parsearXml(xml);

    let procesados = 0;
    let errores = 0;
    const nuevos: LlamadoParseado[] = [];

    for (const item of items) {
      try {
        const licitacion = mapearItemALicitacion(item);
        this.enriquecerInciso(licitacion);
        const { esNuevo } = await this.upsertLicitacion(licitacion);
        if (esNuevo) nuevos.push(licitacion);
        procesados++;
      } catch (err) {
        errores++;
        this.logger.warn(
          `No se pudo procesar el item "${item.title}": ${err.message}`,
        );
      }
    }

    await this.dispararAlertas(nuevos);

    this.logger.log(
      `Ingesta completa: ${procesados} ok, ${errores} con error, ${nuevos.length} nuevos`,
    );
    return { procesados, errores, nuevos: nuevos.length };
  }

  // El motor de alertas corre DESPUÉS del loop (los upserts ya están
  // seguros en Mongo) y sus errores no tiran la ingesta: notificar es
  // valor agregado, persistir los llamados es la misión (regla 5).
  private async dispararAlertas(nuevos: LlamadoParseado[]): Promise<void> {
    if (nuevos.length === 0) return;
    try {
      const notificaciones = await this.alertasMatcher.procesarNuevosLlamados(nuevos);
      if (notificaciones > 0) {
        this.logger.log(`Motor de alertas: ${notificaciones} notificaciones generadas`);
      }
    } catch (err) {
      this.logger.error(`El motor de alertas falló (la ingesta siguió): ${err.message}`);
    }
  }

  // --- Descarga ---------------------------------------------------

  private async descargarRss(): Promise<string> {
    const response = await fetch(RSS_URL);
    if (!response.ok) {
      throw new Error(`RSS respondió ${response.status}`);
    }
    return response.text();
  }

  // --- Parseo XML → objetos crudos --------------------------------

  private parsearXml(xml: string): RssItemRaw[] {
    const parsed = this.xmlParser.parse(xml);
    const items = parsed?.rss?.channel?.item;

    if (!items) return [];
    // Si hay un solo <item>, fast-xml-parser lo devuelve como objeto
    // suelto en vez de array de 1 elemento - normalizamos siempre a array.
    return Array.isArray(items) ? items : [items];
  }

  // --- Enriquecimiento ----------------------------------------------

  // El RSS no trae el código de inciso; el parser (puro, sin acceso a
  // Mongo) lo deja en 0 y el ORQUESTADOR lo resuelve acá cruzando el
  // nombre contra la codiguera. Si no hay match (UCC/UACM, que no son
  // un inciso), queda el 0 honesto.
  private enriquecerInciso(licitacion: LlamadoParseado): void {
    if (licitacion.organismo && licitacion.organismo.inciso === 0) {
      licitacion.organismo.inciso = this.codiguerasService.resolverInciso(
        licitacion.organismo.nombreInciso,
      );
    }
  }

  // --- Persistencia -------------------------------------------------

  private async upsertLicitacion(
    licitacion: LlamadoParseado,
  ): Promise<{ esNuevo: boolean }> {
    // findOneAndUpdate con upsert:true es la operación clave: si el
    // "id" (el de ARCE, no el _id de Mongo) ya existe, actualiza el
    // documento; si no existe, lo crea. Así nunca duplicamos un
    // llamado aunque el RSS lo repita en cada corrida.
    //
    // includeResultMetadata: el motor de alertas necesita distinguir
    // INSERCIÓN de actualización (sin esto, cada llamado se
    // re-notificaría en cada corrida del cron, 96 veces por día).
    // updatedExisting === false → el upsert insertó: es un llamado nuevo.
    const resultado = await this.licitacionModel.findOneAndUpdate(
      { id: licitacion.id },
      { $set: licitacion },
      { upsert: true, includeResultMetadata: true },
    );
    return { esNuevo: !resultado.lastErrorObject?.updatedExisting };
  }
}
