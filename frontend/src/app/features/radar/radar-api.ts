// src/app/features/radar/radar-api.ts
import { Service, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Api } from '../../core/api';

// Espejo de GET /licitaciones/radar-precios
export interface ResumenPrecio {
  moneda: string;
  minimo: number;
  promedio: number;
  maximo: number;
  muestras: number;
}

export interface MuestraPrecio {
  licitacionId: string;
  fecha: string;
  organismo: string;
  inciso: number;
  proveedor?: string;
  numeroDocumento?: string;
  item: string;
  cantidad: number;
  unidad: string;
  precioUnitario: number;
  moneda?: string;
}

export interface RadarPrecios {
  texto: string;
  resumenPorMoneda: ResumenPrecio[];
  muestras: MuestraPrecio[];
}

@Service()
export class RadarApi {
  private api = inject(Api);

  buscar(texto: string): Observable<RadarPrecios> {
    return this.api.get<RadarPrecios>(
      `licitaciones/radar-precios?texto=${encodeURIComponent(texto)}`,
    );
  }
}
