// backend/src/licitaciones/parsers/ocds-release.parser.ts
//
// Funciones PURAS que mapean releases OCDS (Open Contracting Data Standard,
// los dumps anuales de ARCE en catalogodatos.gub.uy) a nuestro dominio.
// Mismo patrón que rss-llamado.parser.ts: sin I/O, sin Mongo, testeables.
//
// Un "release" OCDS es un evento sobre una compra, identificado por su tag:
//   tender / tenderUpdate / tenderCancellation  → datos del llamado
//   award / awardCancellation                   → datos de la adjudicación
// El campo tender.id es EL MISMO id del portal que extraemos del RSS
// (incluido el prefijo "i" de los importados) — por eso ambas fuentes
// convergen en el mismo documento vía upsert.

import {
  TipoContratacion,
  EstadoLlamado,
  EstadoResolucion,
  Moneda,
} from '../../shared/types/enums';
import type { Licitacion, ItemLlamado, Organismo } from '../../shared/types';
import { extraerNumeroYAnio } from './rss-llamado.parser';
import type { LlamadoParseado } from './rss-llamado.parser';

// --- Formas crudas del JSON OCDS (solo lo que usamos) ----------------

interface OcdsContactPoint {
  name?: string;
  email?: string;
  telephone?: string;
}

interface OcdsParty {
  id: string;
  roles: string[];
  name: string;
  contactPoint?: OcdsContactPoint;
}

interface OcdsItem {
  id: number | string;
  quantity?: number;
  classification?: { id?: string; description?: string };
  unit?: { id?: string; name?: string; value?: { amount?: number; currency?: string } };
}

interface OcdsAward {
  id: string;
  status?: string; // active | unsuccessful | cancelled | pending
  date?: string;
  items?: OcdsItem[];
  suppliers?: { id: string; name: string }[];
}

export interface OcdsRelease {
  ocid: string; // "ocds-yfs5dr-i455644"
  id: string; //   "llamado-i455644" | "adjudicacion-i455644"
  date: string;
  tag: string[];
  parties?: OcdsParty[];
  buyer?: { id: string; name: string };
  tender?: {
    id: string; // el id del portal, ej "i455644" o "1352393"
    title?: string;
    description?: string;
    status?: string; // active | cancelled (ausente en tenderUpdate)
    procurementMethodDetails?: string;
    tenderPeriod?: { startDate?: string; endDate?: string };
    submissionMethodDetails?: string;
  };
  awards?: OcdsAward[];
}

// --- Mapeos de codigueras --------------------------------------------

// Auditoría 2025: monedas reales en los dumps. CHF/BRL/ZAR aparecen en
// 4 items de 322k — no ameritan enum propio, quedan sin moneda.
const MAPA_MONEDAS: Record<string, Moneda> = {
  UYU: Moneda.PESOS_URUGUAYOS,
  USD: Moneda.DOLARES,
  EUR: Moneda.EUROS,
  UYI: Moneda.UI,
};

// tender.status OCDS → nuestro estado. Solo 'active' y 'cancelled'
// aparecen en los dumps 2025 (los tenderUpdate no traen status).
const MAPA_ESTADO_TENDER: Record<string, EstadoLlamado> = {
  active: EstadoLlamado.VIGENTE,
  cancelled: EstadoLlamado.SIN_EFECTO,
};

function mapearMoneda(codigo?: string): Moneda | undefined {
  return codigo ? MAPA_MONEDAS[codigo] : undefined;
}

function mapearTipo(procurementMethodDetails?: string): TipoContratacion {
  // OCDS trae el nombre EXACTO de la codiguera de ARCE ("Compra Directa",
  // "PFI - Comparación de precios"...) — match directo contra el enum.
  const tipos = Object.values(TipoContratacion);
  const encontrado = tipos.find((t) => t === procurementMethodDetails);
  return encontrado ?? TipoContratacion.PROCEDIMIENTO_ESPECIAL;
}

// parties[].id tiene forma "66-1" = inciso 66 (OSE), unidad ejecutora 1.
// Es la resolución del TODO `inciso: 0` que dejamos en el parser del RSS.
//
// Sin buyer devuelve undefined, NO un organismo vacío: estos mapeos son
// patches parciales ($set) y un {inciso:0, nombreInciso:''} pisaría el
// organismo bueno que dejó el release anterior (pasó con awards sin
// buyer del dump 2025 — BUG detectado en producción por el autor).
function mapearOrganismo(buyer?: { id: string; name: string }): Organismo | undefined {
  if (!buyer) return undefined;
  const inciso = parseInt(buyer.id?.split('-')[0] ?? '', 10);
  return {
    inciso: Number.isNaN(inciso) ? 0 : inciso,
    nombreInciso: buyer.name ?? '',
    unidadEjecutora: buyer.name ?? '',
  };
}

// Campos vacíos vienen como " " (espacio) — normalizamos a undefined
function limpiar(valor?: string): string | undefined {
  const v = valor?.trim();
  return v ? v : undefined;
}

// --- Release de llamado (tender*) → Licitacion ------------------------

export function mapearTenderALicitacion(release: OcdsRelease): LlamadoParseado {
  const tender = release.tender;
  if (!tender?.id) {
    throw new Error(`Release ${release.id} sin tender.id`);
  }

  const { numeroCompra, anio: anioDelTitulo } = extraerNumeroYAnio(tender.title ?? '');
  // El fallback de extraerNumeroYAnio es "año ACTUAL" — correcto para el
  // RSS (solo trae vigentes del año corriente) pero VENENO en una ingesta
  // histórica: un tender de 2008 sin número parseable quedaba como 2026.
  // Sin número, el año sale de la fecha real del llamado.
  const fechaPublicacion = tender.tenderPeriod?.startDate
    ? new Date(tender.tenderPeriod.startDate)
    : new Date(release.date);
  const anio = numeroCompra ? anioDelTitulo : fechaPublicacion.getFullYear();
  const procuring = release.parties?.find((p) => p.roles.includes('procuringEntity'));
  const contactPoint = procuring?.contactPoint;

  // OJO: solo devolvemos las claves que el release realmente trae.
  // Un tenderUpdate sin status NO debe pisar el estado ya guardado —
  // el servicio elimina las claves undefined antes del $set.
  return {
    id: tender.id,
    numeroCompra,
    anio,
    tipo: mapearTipo(tender.procurementMethodDetails),
    estado: tender.status ? MAPA_ESTADO_TENDER[tender.status] : undefined,
    organismo: mapearOrganismo(release.buyer),
    descripcion: limpiar(tender.description) ?? limpiar(tender.title) ?? '',
    contacto: contactPoint
      ? {
          nombre: limpiar(contactPoint.name) ?? '',
          email: limpiar(contactPoint.email) ?? '',
          telefono: limpiar(contactPoint.telephone),
        }
      : undefined,
    fechaPublicacion,
    fechaRecepcionOfertas: tender.tenderPeriod?.endDate
      ? new Date(tender.tenderPeriod.endDate)
      : undefined,
    urlOrigen: `https://www.comprasestatales.gub.uy/consultas/detalle/id/${tender.id}`,
    fechaIngesta: new Date(),
  };
}

// --- Release de adjudicación (award*) → patch parcial ------------------

// award.status OCDS → EstadoResolucion (aproximación documentada:
// OCDS no distingue adjudicación total/parcial, asumimos total).
const MAPA_ESTADO_AWARD: Record<string, EstadoResolucion> = {
  active: EstadoResolucion.ADJUDICADA_TOTALMENTE,
  unsuccessful: EstadoResolucion.DECLARADA_DESIERTA,
  cancelled: EstadoResolucion.DECLARADA_SIN_EFECTO,
};

// El estado general del llamado que implica cada resolución
const MAPA_ESTADO_LLAMADO_POR_AWARD: Record<string, EstadoLlamado> = {
  active: EstadoLlamado.ADJUDICADO,
  unsuccessful: EstadoLlamado.DESIERTO,
  cancelled: EstadoLlamado.SIN_EFECTO,
};

// Los suppliers vienen como "R/214365280014" — R + RUT de 12 dígitos.
// El número es la MISMA clave que numeroDocumento en RUPE (join natural).
function inferirTipoDocumento(idSupplier: string): string {
  const [prefijo] = idSupplier.split('/');
  if (prefijo === 'R') return 'RUT';
  return prefijo || 'Genérico';
}

export function extraerIdDeOcid(ocid: string): string {
  // "ocds-yfs5dr-i455644" → "i455644". El prefijo ocds-yfs5dr es el
  // identificador registrado de Uruguay en el estándar OCDS.
  const match = ocid.match(/^ocds-\w+-(\w+)$/);
  if (!match) {
    throw new Error(`No se pudo extraer el id del ocid: ${ocid}`);
  }
  return match[1];
}

export function mapearAwardALicitacion(release: OcdsRelease): LlamadoParseado {
  const award = release.awards?.[0];
  if (!award) {
    throw new Error(`Release ${release.id} sin awards`);
  }

  const id = extraerIdDeOcid(release.ocid);
  const supplier = award.suppliers?.[0];
  const items = (award.items ?? []).map(mapearItem);

  // Monto total = Σ cantidad × precio unitario (si comparten moneda)
  const monedas = new Set(
    (award.items ?? [])
      .map((i) => i.unit?.value?.currency)
      .filter((c): c is string => !!c),
  );
  const montoTotal =
    monedas.size === 1
      ? (award.items ?? []).reduce(
          (suma, i) => suma + (i.quantity ?? 0) * (i.unit?.value?.amount ?? 0),
          0,
        )
      : undefined; // monedas mezcladas: sumar sería mentir

  return {
    id,
    estado: award.status ? MAPA_ESTADO_LLAMADO_POR_AWARD[award.status] : undefined,
    organismo: mapearOrganismo(release.buyer),
    items: items.length > 0 ? items : undefined,
    adjudicacion: {
      estado: award.status
        ? MAPA_ESTADO_AWARD[award.status]
        : EstadoResolucion.RESULTADO_CONVOCATORIA,
      proveedor: supplier
        ? {
            tipoDocumento: inferirTipoDocumento(supplier.id),
            numeroDocumento: supplier.id.split('/')[1] ?? supplier.id,
            razonSocial: supplier.name,
          }
        : undefined,
      montoTotal,
      moneda: monedas.size === 1 ? mapearMoneda([...monedas][0]) : undefined,
      fechaAdjudicacion: award.date ? new Date(award.date) : undefined,
    },
    urlOrigen: `https://www.comprasestatales.gub.uy/consultas/detalle/id/${id}`,
    fechaIngesta: new Date(),
  } as LlamadoParseado;
}

function mapearItem(item: OcdsItem, indice: number): ItemLlamado {
  return {
    numero: typeof item.id === 'number' ? item.id : indice + 1,
    codigoArticulo: parseInt(item.classification?.id ?? '0', 10) || 0,
    descripcion: item.classification?.description ?? item.unit?.name ?? '',
    cantidad: item.quantity ?? 0,
    unidad: item.unit?.name ?? '',
    precioUnitario: item.unit?.value?.amount,
    moneda: mapearMoneda(item.unit?.value?.currency),
  };
}
