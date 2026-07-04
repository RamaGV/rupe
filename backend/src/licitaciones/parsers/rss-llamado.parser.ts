// backend/src/licitaciones/parsers/rss-llamado.parser.ts
//
// Funciones PURAS de parseo del RSS de ARCE: reciben texto, devuelven
// datos del dominio. Sin I/O, sin Mongo, sin NestJS — mismo patrón que
// rupe-csv.parser.ts. Esto las hace testeables con un simple describe/it
// y desacopla "entender el formato de ARCE" de "persistir en Mongo".
//
// El RSS de ARCE no es estructurado: todo viene mezclado en el <title>
// y <description>. Estas regex son el corazón del parser y lo que más
// mantenimiento va a necesitar si ARCE cambia el formato.

import { TipoContratacion, EstadoLlamado } from '../../shared/types/enums';
import type { Licitacion, Organismo } from '../../shared/types';

// Forma cruda de un <item> del feed, tal como lo entrega fast-xml-parser
export interface RssItemRaw {
  title: string;
  link: string;
  description: string;
  pubDate: string;
  guid?: string;
}

// Lo que el parser puede completar desde el RSS. El resto de los campos
// de Licitacion (items, adjudicación...) se enriquecen en pasos posteriores.
export type LlamadoParseado = Partial<Licitacion>;

export function mapearItemALicitacion(item: RssItemRaw): LlamadoParseado {
  const tipo = extraerTipo(item.title);
  const { numeroCompra, anio } = extraerNumeroYAnio(item.title);
  const organismo = extraerOrganismo(item.title);
  const id = extraerIdDeLink(item.link);

  // La <description> cruda trae HTML dentro de CDATA (ver
  // normalizarDescripcion). Se normaliza UNA vez acá y todos los
  // extractores de abajo trabajan sobre texto plano.
  const descripcionPlana = normalizarDescripcion(item.description);
  const fechaRecepcionOfertas = extraerFechaApertura(descripcionPlana);
  const fechaPublicacion = extraerFechaPublicacion(descripcionPlana);

  return {
    id,
    numeroCompra,
    anio,
    tipo,
    estado: EstadoLlamado.VIGENTE, // este RSS solo trae vigentes
    aperturaElectronica: descripcionPlana.includes('Apertura electrónica'),
    organismo,
    descripcion: limpiarDescripcion(descripcionPlana),
    items: [], // el RSS no trae el detalle de items - se completa
               // más adelante si scrapeamos la página de detalle
    fechaPublicacion: fechaPublicacion ?? new Date(item.pubDate),
    fechaRecepcionOfertas,
    fechaUltimaModificacion: extraerFechaModificacion(descripcionPlana),
    urlOrigen: item.link,
    fechaIngesta: new Date(),
  };
}

export function extraerIdDeLink(link: string): string {
  // Formatos reales observados en el feed (auditoría 2026-07):
  //   .../consultas/detalle/id/1352393     → llamados nativos del SICE (811 items)
  //   .../consultas/detalle/id/i494938     → llamados IMPORTADOS de sistemas
  //                                          propios (IM, OSE, ANP, ANCAP...) (156 items)
  // El ID es un identificador EXTERNO y opaco: se guarda tal cual viene,
  // sin quitar el prefijo. Los dos espacios de numeración son independientes,
  // así que "i495595" y "495595" podrían ser llamados distintos.
  //
  // \w+ acepta cualquier ID alfanumérico (tolera prefijos nuevos), pero
  // sigue lanzando error si el link no termina en /id/<algo>: ese throw
  // es nuestra alarma de calidad de datos (se loguea y la ingesta sigue).
  const match = link.match(/\/id\/(\w+)\/?$/);
  if (!match) {
    throw new Error(`No se pudo extraer el id del link: ${link}`);
  }
  return match[1];
}

export function extraerTipo(title: string): TipoContratacion {
  const tiposConocidos = Object.values(TipoContratacion);
  const encontrado = tiposConocidos.find((t) => title.includes(t));
  return encontrado ?? TipoContratacion.PROCEDIMIENTO_ESPECIAL;
}

// Formas REALES del número de compra (auditoría del feed 2026-07, 967 títulos):
//   14339/2026        solo dígitos, de 1 a 10 de largo (827 items — "2/2025" existe!)
//   A190700/2026      prefijo de letra: sistemas importados, ej. Intendencia de Mdeo (132)
//   A185165A/2026     prefijo Y sufijo de letra (8)
//   2341046600/2026   10 dígitos: ANCAP (4)
// La versión vieja \d{3,7} fallaba con números cortos (318 quedaban vacíos) y
// PEOR: matcheaba parcial en los largos ("2341046600" → guardaba "1046600").
// Un regex estricto que matchea "algo parecido" corrompe datos SIN loguear nada.
//
// Constante única: extraerNumeroYAnio y extraerOrganismo dependen del mismo
// patrón — si ARCE cambia el formato, se corrige en UN solo lugar.
const REGEX_NUMERO_COMPRA = /\b([A-Za-z]?\d+[A-Za-z]?\/(\d{4}))\b/;

// Derivado del anterior: corta el prefijo "Tipo 12345/2026 - " de partes[0]
// del título para aislar el nombre del inciso. Se construye UNA vez a nivel
// de módulo (new RegExp dentro de la función recompilaría en cada item).
const REGEX_CORTE_HASTA_NUMERO = new RegExp(
  `^.*?${REGEX_NUMERO_COMPRA.source}\\s*(?:-\\s*)?`,
);

export function extraerNumeroYAnio(title: string): { numeroCompra: string; anio: number } {
  const match = title.match(REGEX_NUMERO_COMPRA);
  // Sin número legible es degradación tolerable (a diferencia del id,
  // que es la clave del upsert): no abortamos el item por esto.
  if (!match) return { numeroCompra: '', anio: new Date().getFullYear() };
  return { numeroCompra: match[1], anio: parseInt(match[2], 10) };
}

export function extraerOrganismo(title: string): Organismo {
  // Formato actual del título (todos los items del feed 2026-07):
  //   "Licitación Abreviada 28907/2026 - Administración Nacional de Puertos | Administración Nacional de Puertos"
  // Formato viejo (sin guion, lo seguimos soportando):
  //   "Licitación Abreviada 202606/2026 Presidencia de la Republica | Presidencia de la República y Unidades Dependientes"
  const partes = title.split('|').map((p) => p.trim());
  const unidadEjecutora = partes[1] ?? '';
  // El nombreInciso queda mezclado con tipo+número en partes[0]; lo aislamos
  // cortando todo hasta el número de compra inclusive, más el " - " opcional.
  const nombreInciso = partes[0].replace(REGEX_CORTE_HASTA_NUMERO, '').trim();

  return {
    inciso: 0, // se resuelve cruzando con ORGANISMOS_INCISO en un paso posterior
    nombreInciso,
    unidadEjecutora,
  };
}

function extraerFechaApertura(description: string): Date | undefined {
  // "Recepción de ofertas hasta: 26/06/2026 08:30hs"
  const match = description.match(
    /Recepción de ofertas hasta:\s*(\d{2}\/\d{2}\/\d{4})\s*(\d{2}:\d{2})?/,
  );
  if (!match) return undefined;
  return parsearFechaUruguaya(match[1], match[2]);
}

function extraerFechaPublicacion(description: string): Date | undefined {
  const match = description.match(/Publicado:\s*(\d{2}\/\d{2}\/\d{4})\s*(\d{2}:\d{2})?/);
  if (!match) return undefined;
  return parsearFechaUruguaya(match[1], match[2]);
}

function extraerFechaModificacion(description: string): Date | undefined {
  const match = description.match(
    /Última Modificación:\s*(\d{2}\/\d{2}\/\d{4})\s*(\d{2}:\d{2})?/,
  );
  if (!match) return undefined;
  return parsearFechaUruguaya(match[1], match[2]);
}

// Uruguay usa DD/MM/YYYY - JS Date con new Date("26/06/2026") lo
// interpreta mal (formato US), así que armamos la fecha a mano.
function parsearFechaUruguaya(fecha: string, hora?: string): Date {
  const [dia, mes, anio] = fecha.split('/').map(Number);
  const [h, m] = (hora ?? '00:00').split(':').map(Number);
  return new Date(anio, mes - 1, dia, h, m);
}

// La <description> del feed es CDATA con HTML adentro (forma real, auditoría
// del feed completo 2026-07, 929 items):
//   "objeto<br/> Recepción de ofertas hasta: ...<br/>Publicado:&nbsp;03&sol;07&sol;2026 12:20hs"
// CDATA significa "texto literal": fast-xml-parser NO decodifica entidades
// ahí adentro (y es correcto — es la definición de CDATA). Sin este paso:
//   - limpiarDescripcion separaba por \n que nunca existe (BUG-4)
//   - "Publicado:&nbsp;03&sol;07&sol;2026" no matcheaba el regex de fecha
//     (caía al fallback pubDate, pérdida menor)
//   - "&Uacute;ltima Modificaci&oacute;n" no matcheaba NUNCA:
//     fechaUltimaModificacion era siempre undefined (pérdida silenciosa)
//
// Universo real de entidades en el feed: &sol; &nbsp; &Uacute; &oacute;
// (las 4 vienen del boilerplate de fechas). El mapa agrega las XML estándar
// y los acentos del español como tolerancia previsible. Una entidad
// desconocida se deja tal cual: queda visible en la descripción (telemetría),
// que es mejor que borrarla en silencio.
const ENTIDADES_HTML: Record<string, string> = {
  // universo observado en el feed
  '&sol;': '/',
  '&nbsp;': ' ',
  '&Uacute;': 'Ú',
  '&oacute;': 'ó',
  // tolerancia previsible: XML estándar + acentos del español
  '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&apos;': "'",
  '&aacute;': 'á', '&eacute;': 'é', '&iacute;': 'í', '&uacute;': 'ú',
  '&Aacute;': 'Á', '&Eacute;': 'É', '&Iacute;': 'Í', '&Oacute;': 'Ó',
  '&ntilde;': 'ñ', '&Ntilde;': 'Ñ',
};

export function normalizarDescripcion(raw: string): string {
  return raw
    .replace(/<br\s*\/?>/gi, '\n') // el feed usa solo "<br/>"; tolera variantes
    .replace(/&[a-zA-Z]+;/g, (entidad) => ENTIDADES_HTML[entidad] ?? entidad);
}

function limpiarDescripcion(descripcionPlana: string): string {
  // Nos quedamos solo con la primera línea real (el objeto de la
  // compra), descartando las líneas de fechas que ya extrajimos
  // como campos estructurados. Espera texto YA normalizado.
  return descripcionPlana
    .split('\n')
    .map((l) => l.trim())
    .find((l) => l.length > 0 && !l.startsWith('Recepción') && !l.startsWith('Publicado'))
    ?.trim() ?? '';
}
