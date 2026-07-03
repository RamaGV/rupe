// backend/src/ingesta/repositories/proveedores-repository.interface.ts
import { ProveedorRupe } from '../../shared/types';

// Token de inyección: las interfaces de TypeScript no existen en runtime,
// así que usamos un Symbol como "nombre" para pedirle a NestJS
// una implementación concreta de este contrato.
export const PROVEEDORES_REPOSITORY = Symbol('PROVEEDORES_REPOSITORY');

export interface FiltrosProveedor {
  page?: number;
  limit?: number;
  texto?: string; // busca en razón social y número de documento
}

export interface PaginaProveedores {
  datos: ProveedorRupe[];
  total: number;
  page: number;
  totalPaginas: number;
}

// La paginación es parte del CONTRATO, no un detalle del adaptador:
// devolver "todo" nunca es una operación válida con 90k proveedores.
// El adaptador CSV la implementa con slice() en memoria; el futuro
// adaptador Mongo usará skip/limit — el consumidor no nota la diferencia.
export interface ProveedoresRepository {
  buscar(filtros: FiltrosProveedor): Promise<PaginaProveedores>;
  findByDocumento(numeroDocumento: string): Promise<ProveedorRupe | null>;
}