// frontend/src/app/features/licitaciones/licitaciones-api.ts
import { Service, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Api } from '../../core/api';

// El contrato de dominio vive en @rupe/shared (una sola fuente de
// verdad con el backend). Las formas de acá se DERIVAN: Serializado<T>
// convierte Date→string, porque JSON no tiene fechas — lo que llega
// por HTTP es siempre texto.
import type {
  Licitacion as LicitacionDominio,
  Organismo as OrganismoDominio,
  ItemLlamado as ItemLlamadoDominio,
  Adjudicacion as AdjudicacionDominio,
  Serializado,
} from '@rupe/shared';

export type Licitacion = Serializado<LicitacionDominio>;
export type Organismo = Serializado<OrganismoDominio>;
export type ItemLlamado = Serializado<ItemLlamadoDominio>;
export type Adjudicacion = Serializado<AdjudicacionDominio>;

// Shape exacto que devuelve LicitacionesService.buscar() en el backend
export interface PaginaLicitaciones {
  datos: Licitacion[];
  total: number;
  page: number;
  totalPaginas: number;
}

// Espejo del BuscarLicitacionesDto del backend
export interface FiltrosLicitaciones {
  page?: number;
  limit?: number;
  texto?: string;
  estado?: string;
  tipo?: string;
  anio?: number;
  inciso?: number;
  orden?: 'recientes' | 'cierre' | 'monto';
}

// Opciones para los <select> de la UI (espejo de los enums del backend)
export const ESTADOS_LLAMADO = ['vigente', 'adjudicado', 'desierto', 'sin_efecto'];

export const TIPOS_CONTRATACION = [
  'Compra Directa',
  'Concurso de Precios',
  'Licitación Abreviada',
  'Licitación Pública',
  'Compra por Excepción',
  'Llamado a Expresiones de Interés',
  'Concesión',
  'Convenio Marco',
  'Pregón',
  'Procedimiento Especial',
  'Solicitud de Información',
];

export const ORDENES = [
  { valor: 'recientes', etiqueta: 'Más recientes' },
  { valor: 'cierre', etiqueta: 'Próximas a cerrar' },
  { valor: 'monto', etiqueta: 'Mayor monto adjudicado' },
] as const;

@Service()
export class LicitacionesApi {
  private api = inject(Api);

  buscar(filtros: FiltrosLicitaciones = {}): Observable<PaginaLicitaciones> {
    // URLSearchParams arma el query string omitiendo lo que no vino
    // y escapando acentos/espacios (los tipos tienen ambos)
    const params = new URLSearchParams();
    for (const [clave, valor] of Object.entries(filtros)) {
      if (valor !== undefined && valor !== null && valor !== '') {
        params.set(clave, String(valor));
      }
    }
    return this.api.get<PaginaLicitaciones>(`licitaciones?${params.toString()}`);
  }

  getPorId(id: string): Observable<Licitacion> {
    return this.api.get<Licitacion>(`licitaciones/${id}`);
  }
}
