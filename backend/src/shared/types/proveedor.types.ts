// backend/src/shared/types/proveedor.types.ts
import { TipoDocumento, EstadoProveedor } from './enums';

// Dirección fiscal del proveedor
export interface DireccionFiscal {
  pais: string;
  departamento?: string;
  localidad?: string;
  domicilio?: string;
}

// Perfil completo de un proveedor inscripto en RUPE
export interface ProveedorRupe {
  // Identificación
  tipoDocumento: TipoDocumento;
  numeroDocumento: string;
  razonSocial: string;

  // Estado en el registro
  estado: EstadoProveedor;
  pais: string;

  // Domicilio
  direccionFiscal?: DireccionFiscal;

  // Metadatos
  urlOrigen: string;
  fechaIngesta: Date;
}

// Una adjudicación resumida, para el historial del perfil
export interface AdjudicacionResumen {
  licitacionId: string;
  numeroCompra: string;
  descripcion: string;
  organismo: string;
  montoTotal?: number;
  moneda?: string;
  fechaAdjudicacion?: Date;
  razonSocial?: string; // como figura en la adjudicación (fallback de identidad)
}

// Total adjudicado en UNA moneda. No existe "total general": sumar
// UYU + USD en un solo número sería inventar una conversión.
export interface MontoPorMoneda {
  moneda: string; // 'Pesos Uruguayos', 'Dólares'... o 'sin moneda'
  total: number;
  cantidad: number; // cuántas adjudicaciones en esa moneda
}

// Perfil enriquecido: datos de RUPE + historial real de adjudicaciones
// (cruce por numeroDocumento contra la colección de licitaciones)
export interface PerfilEmpresa extends ProveedorRupe {
  totalLicitacionesGanadas: number;
  montosPorMoneda: MontoPorMoneda[];
  organismosMasFrecuentes: string[];
  ultimaActividad?: Date;
  ultimasAdjudicaciones: AdjudicacionResumen[];
}