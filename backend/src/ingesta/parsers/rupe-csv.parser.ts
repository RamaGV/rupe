// backend/src/ingesta/parsers/rupe-csv.parser.ts
import { ProveedorRupe, EstadoProveedor, TipoDocumento } from '../../shared/types';

// Forma exacta de una fila del CSV real de RUPE
export interface FilaCsvRupe {
  pais_prov: string;
  identificacion_prov: string;
  denominacion_social_prov: string;
  domicilio_fiscal: string;
  localidad_prov: string;
  departamento_prov: string;
  estado_prov: string;
}

const MAPA_ESTADOS: Record<string, EstadoProveedor> = {
  'ACTIVO': EstadoProveedor.ACTIVO,
  'EN INGRESO': EstadoProveedor.EN_INGRESO,
  'BAJA DGI': EstadoProveedor.BAJA_DGI,
};

// "Sin dato" es el placeholder real del gobierno para campos vacíos.
// Lo normalizamos a undefined para no ensuciar la base con ese string.
function limpiarCampo(valor: string): string | undefined {
  const limpio = valor?.trim();
  if (!limpio || limpio.toLowerCase() === 'sin dato') return undefined;
  return limpio;
}

// Heurística: RUT uruguayo tiene 12 dígitos, cédula tiene 7-8.
// No es 100% infalible pero cubre el caso general del dataset.
function inferirTipoDocumento(identificacion: string): TipoDocumento {
  const soloNumeros = identificacion.replace(/\D/g, '');
  if (soloNumeros.length === 12) return TipoDocumento.RUT;
  if (soloNumeros.length >= 6 && soloNumeros.length <= 8) return TipoDocumento.CEDULA;
  return TipoDocumento.GENERICO;
}

function mapearEstado(valor: string): EstadoProveedor {
  const estado = MAPA_ESTADOS[valor?.trim()?.toUpperCase()];
  return estado ?? EstadoProveedor.DESCONOCIDO;
}

export function parsearFilaRupe(fila: FilaCsvRupe, urlOrigen: string): ProveedorRupe {
  return {
    tipoDocumento: inferirTipoDocumento(fila.identificacion_prov),
    numeroDocumento: fila.identificacion_prov.trim(),
    razonSocial: fila.denominacion_social_prov.trim(),
    estado: mapearEstado(fila.estado_prov),
    pais: fila.pais_prov.trim(),
    direccionFiscal: {
      pais: fila.pais_prov.trim(),
      departamento: limpiarCampo(fila.departamento_prov),
      localidad: limpiarCampo(fila.localidad_prov),
      domicilio: limpiarCampo(fila.domicilio_fiscal),
    },
    urlOrigen,
    fechaIngesta: new Date(),
  };
}