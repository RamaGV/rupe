// backend/src/shared/types/licitacion.types.ts

import { TipoContratacion, EstadoLlamado, EstadoResolucion, Moneda, FamiliaArticulo } from './enums';

// Contacto responsable del llamado
export interface ContactoLlamado {
  nombre: string;
  email: string;
  telefono?: string;
}

// Ítem individual dentro de un llamado (lo que se quiere comprar)
export interface ItemLlamado {
  numero: number;
  codigoArticulo: number;
  descripcion: string;
  cantidad: number;
  unidad: string;
  moneda: Moneda;
  familia?: FamiliaArticulo;
  caracteristicas?: Record<string, string>; // clave-valor libre según el artículo
}

// Aclaración o documento adjunto al llamado
export interface AclaracionLlamado {
  fecha: Date;
  texto: string;
  urlArchivo?: string;
}

// Organismo contratante
export interface Organismo {
  inciso: number;
  nombreInciso: string;
  unidadEjecutora: string;
}

// Entidad principal: un llamado/licitación del Estado
export interface Licitacion {
  // Identificación
  id: string;                          // ID interno del portal (ej: "1351898")
  numeroCcompra: string;               // Número legible (ej: "774/2026")
  anio: number;

  // Clasificación
  tipo: TipoContratacion;
  estado: EstadoLlamado;
  aperturaElectronica: boolean;

  // Organismo
  organismo: Organismo;

  // Contenido
  descripcion: string;
  items: ItemLlamado[];
  contacto?: ContactoLlamado;
  aclaraciones: AclaracionLlamado[];

  // Fechas clave
  fechaPublicacion: Date;
  fechaRecepcionOfertas?: Date;
  fechaUltimaModificacion?: Date;

  // Adjudicación (se completa si el estado es adjudicado)
  adjudicacion?: Adjudicacion;

  // Metadatos de ingesta
  urlOrigen: string;                   // URL original del portal ARCE
  fechaIngesta: Date;                  // Cuándo lo capturamos nosotros
}

// Resultado de una adjudicación
export interface Adjudicacion {
  estado: EstadoResolucion;
  proveedor?: ProveedorBasico;
  montoTotal?: number;
  moneda?: Moneda;
  fechaAdjudicacion?: Date;
  vigenciaHasta?: Date;
}

// Referencia básica a un proveedor (dentro de una licitación)
export interface ProveedorBasico {
  tipoDocumento: string;
  numeroDocumento: string;
  razonSocial: string;
}