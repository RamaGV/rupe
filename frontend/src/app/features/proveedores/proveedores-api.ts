// frontend/src/app/features/proveedores/proveedores-api.ts
import { Service, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Api } from '../../core/api';

export interface ProveedorRupe {
  tipoDocumento: string;
  numeroDocumento: string;
  razonSocial: string;
  estado: string;
  pais: string;
  direccionFiscal?: {
    departamento?: string;
    localidad?: string;
    domicilio?: string;
  };
}

// Copia manual del contrato del backend (shared/types/proveedor.types.ts)
export interface AdjudicacionResumen {
  licitacionId: string;
  numeroCompra: string;
  descripcion: string;
  organismo: string;
  montoTotal?: number;
  moneda?: string;
  fechaAdjudicacion?: string; // ISO string por HTTP
}

export interface MontoPorMoneda {
  moneda: string;
  total: number;
  cantidad: number;
}

export interface PerfilEmpresa extends ProveedorRupe {
  totalLicitacionesGanadas: number;
  montosPorMoneda: MontoPorMoneda[];
  organismosMasFrecuentes: string[];
  ultimaActividad?: string;
  ultimasAdjudicaciones: AdjudicacionResumen[];
}

export interface PaginaProveedores {
  datos: ProveedorRupe[];
  total: number;
  page: number;
  totalPaginas: number;
}

@Service()
export class ProveedoresApi {
  private api = inject(Api);

  buscar(page = 1, limit = 20, texto = ''): Observable<PaginaProveedores> {
    const filtro = texto ? `&texto=${encodeURIComponent(texto)}` : '';
    return this.api.get<PaginaProveedores>(`proveedores?page=${page}&limit=${limit}${filtro}`);
  }

  getPerfil(documento: string): Observable<PerfilEmpresa> {
    return this.api.get<PerfilEmpresa>(`proveedores/${documento}/perfil`);
  }
}