// backend/src/codigueras/parsers/codigueras-xml.parser.ts
//
// Funciones PURAS de parseo de las codigueras XML de ARCE (dataset
// acce-compras-estatales). Mismo patrón que rss-llamado.parser.ts:
// reciben el XML ya decodificado como string, devuelven dominio.
//
// Formas reales (auditoría 2026-07, servidas por comprasestatales.gub.uy
// en ISO-8859-1 — el que descarga debe decodificar latin1, igual que
// con el CSV de RUPE):
//   <inciso id-inciso="5" nom-inciso="Ministerio de Economía y Finanzas" />
//   <unidad-ejecutora id-inciso="2" id-ue="4" nom-ue="Oficina de Planeamiento y Presupuesto" />

import { XMLParser } from 'fast-xml-parser';

export interface IncisoCodiguera {
  codigo: number;
  nombre: string;
}

export interface UnidadEjecutoraCodiguera {
  inciso: number;
  codigo: number;
  nombre: string;
  vigente: boolean;
}

// ignoreAttributes: false porque TODA la información de estas codigueras
// viene en atributos (prefijados con @_ por fast-xml-parser).
const xmlParser = new XMLParser({ ignoreAttributes: false });

// Normaliza ambos lados del cruce por nombre (título del RSS vs codiguera).
// Auditado contra el feed completo (929 títulos): 920 matchean la codiguera
// con esta normalización. Casos reales que resuelve: "Presidencia de la
// Republica" (RSS viejo, sin tilde) vs "Presidencia de la República";
// "Ministerio de Industria, Energía  y Minería" (doble espacio oficial).
// Delega en la normalización canónica de shared/texto — el nombre propio
// existe para que el código de codigueras diga QUÉ compara, no CÓMO.
import { normalizarTexto } from '../../shared/texto/normalizar';

export function normalizarNombreOrganismo(nombre: string): string {
  return normalizarTexto(nombre);
}

export function parsearIncisosXml(xml: string): IncisoCodiguera[] {
  const parsed = xmlParser.parse(xml);
  const nodos = parsed?.incisos?.inciso;
  if (!nodos) {
    // Sin elemento raíz no hay degradación posible: es otra cosa
    // (una página de error, un formato nuevo). Alarma de calidad.
    throw new Error('El XML de incisos no tiene la estructura <incisos><inciso/>...');
  }

  return alwaysArray(nodos).map((n) => ({
    codigo: parseInt(n['@_id-inciso'], 10),
    nombre: String(n['@_nom-inciso']).trim(),
  }));
}

export function parsearUnidadesEjecutorasXml(xml: string): UnidadEjecutoraCodiguera[] {
  const parsed = xmlParser.parse(xml);
  const nodos = parsed?.['unidades-ejecutoras']?.['unidad-ejecutora'];
  if (!nodos) {
    throw new Error(
      'El XML de unidades ejecutoras no tiene la estructura <unidades-ejecutoras><unidad-ejecutora/>...',
    );
  }

  return alwaysArray(nodos).map((n) => {
    const nombre = String(n['@_nom-ue']).trim();
    return {
      inciso: parseInt(n['@_id-inciso'], 10),
      codigo: parseInt(n['@_id-ue'], 10),
      nombre,
      // El marcador aparece en 6 variantes reales ("NO VIGENTE - ",
      // "NO VIGENTE-", "UNIDAD NO VIGENTE", incrustado al final...).
      // Se detecta con contains y el nombre se guarda TAL CUAL:
      // extirpar 6 formatos distintos de marcador es la clase de
      // limpieza que corrompe datos en silencio.
      vigente: !/no vigente/i.test(nombre),
    };
  });
}

// fast-xml-parser devuelve objeto suelto si hay un solo elemento
// (mismo gotcha que en el RSS): normalizamos siempre a array.
function alwaysArray<T>(x: T | T[]): T[] {
  return Array.isArray(x) ? x : [x];
}
