// frontend/src/app/features/proveedores/proveedores-api.ts
import { Service, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Api } from '../../core/api';

// Derivados del dominio compartido (@rupe/shared). El backend expone
// la vista PÚBLICA (sin fechaIngesta) — acá se llama ProveedorRupe por
// continuidad con los componentes existentes.
import type {
  ProveedorPublico,
  PerfilEmpresa as PerfilEmpresaDominio,
  AdjudicacionResumen as AdjudicacionResumenDominio,
  MontoPorMoneda as MontoPorMonedaDominio,
  Serializado,
} from '@rupe/shared';

export type ProveedorRupe = Serializado<ProveedorPublico>;
export type PerfilEmpresa = Serializado<PerfilEmpresaDominio>;
export type AdjudicacionResumen = Serializado<AdjudicacionResumenDominio>;
export type MontoPorMoneda = Serializado<MontoPorMonedaDominio>;

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