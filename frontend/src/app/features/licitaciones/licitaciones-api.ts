// frontend/src/app/features/licitaciones/licitaciones-api.ts
import { Service, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Api } from '../../core/api';

// Copia manual del contrato del backend (shared/types/licitacion.types.ts).
// Deuda técnica aceptada hasta extraer un paquete @rupe/shared.
// OJO: acá las fechas son string (ISO), no Date — JSON no tiene tipo fecha,
// así que lo que llega por HTTP es siempre texto. Convertir solo si hace falta.
export interface Organismo {
  inciso: number;
  nombreInciso: string;
  unidadEjecutora: string;
}

export interface ItemLlamado {
  numero: number;
  codigoArticulo: number;
  descripcion: string;
  cantidad: number;
  unidad: string;
  precioUnitario?: number; // solo viene de OCDS
  moneda?: string;
}

export interface ContactoLlamado {
  nombre?: string;
  email?: string;
  telefono?: string;
}

export interface ProveedorBasico {
  tipoDocumento: string;
  numeroDocumento: string; // misma clave que numeroDocumento en RUPE
  razonSocial: string;
}

export interface Adjudicacion {
  estado: string;
  proveedor?: ProveedorBasico;
  montoTotal?: number;
  moneda?: string;
  fechaAdjudicacion?: string;
}

export interface Licitacion {
  id: string;
  numeroCompra: string;
  anio: number;
  tipo: string;
  estado: string; // vigente | adjudicado | desierto | sin_efecto
  aperturaElectronica: boolean;
  organismo: Organismo;
  descripcion: string;
  items: ItemLlamado[];
  contacto?: ContactoLlamado;
  adjudicacion?: Adjudicacion;
  fechaPublicacion: string;
  fechaRecepcionOfertas?: string;
  fechaUltimaModificacion?: string;
  urlOrigen: string;
}

// Shape exacto que devuelve LicitacionesService.buscar() en el backend
export interface PaginaLicitaciones {
  datos: Licitacion[];
  total: number;
  page: number;
  totalPaginas: number;
}

@Service()
export class LicitacionesApi {
  private api = inject(Api);

  buscar(page = 1, limit = 20): Observable<PaginaLicitaciones> {
    return this.api.get<PaginaLicitaciones>(`licitaciones?page=${page}&limit=${limit}`);
  }

  getPorId(id: string): Observable<Licitacion> {
    return this.api.get<Licitacion>(`licitaciones/${id}`);
  }
}
