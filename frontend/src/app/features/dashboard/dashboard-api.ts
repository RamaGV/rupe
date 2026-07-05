// src/app/features/dashboard/dashboard-api.ts
import { Service, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Api } from '../../core/api';

// Espejo de GET /estadisticas (EstadisticasController del backend)
export interface MontoPorMoneda {
  moneda: string;
  total: number;
  cantidad: number;
}

export interface OrganismoResumen {
  nombre: string;
  cantidad: number;
}

export interface AdjudicacionReciente {
  licitacionId: string;
  descripcion: string;
  organismo: string;
  proveedor?: string;
  montoTotal?: number;
  moneda?: string;
  fechaAdjudicacion?: string;
}

export interface Estadisticas {
  anio: number | null; // null = histórico completo
  totalLicitaciones: number;
  vigentes: number;
  totalProveedores: number;
  montosPorMoneda: MontoPorMoneda[];
  topOrganismos: OrganismoResumen[];
  ultimasAdjudicaciones: AdjudicacionReciente[];
}

@Service()
export class DashboardApi {
  private api = inject(Api);

  // sin anio = histórico completo; con anio = "este año" como marco
  getEstadisticas(anio?: number): Observable<Estadisticas> {
    const filtro = anio ? `?anio=${anio}` : '';
    return this.api.get<Estadisticas>(`estadisticas${filtro}`);
  }
}
