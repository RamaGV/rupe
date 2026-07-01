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

// Perfil enriquecido para mostrar en el frontend
// (cuando tengamos más datos de una empresa, ej: historial de adjudicaciones)
export interface PerfilEmpresa extends ProveedorRupe {
  totalLicitacionesGanadas: number;
  totalMontoAdjudicado: number;
  organismosMasFrecuentes: string[];
  ultimaActividad?: Date;
}