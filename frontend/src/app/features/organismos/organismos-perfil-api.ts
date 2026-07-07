// src/app/features/organismos/organismos-perfil-api.ts
import { Service, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Api } from '../../core/api';
import { MontoPorMoneda } from '../proveedores/proveedores-api';
import { ProveedorTop, TipoResumen } from '../dashboard/dashboard-api';

// Espejo de GET /organismos/:inciso/perfil (el perfil de empresa, dado vuelta)
export interface AdjudicacionDelOrganismo {
  licitacionId: string;
  descripcion: string;
  proveedor?: string;
  montoTotal?: number;
  moneda?: string;
  fechaAdjudicacion?: string;
}

export interface PerfilOrganismo {
  inciso: number;
  nombre: string;
  totalLlamados: number;
  registradoDesde?: string;
  vigentes: number;
  montosPorMoneda: MontoPorMoneda[];
  topProveedores: ProveedorTop[];
  porTipo: TipoResumen[];
  ultimasAdjudicaciones: AdjudicacionDelOrganismo[];
}

@Service()
export class OrganismosPerfilApi {
  private api = inject(Api);

  getPerfil(inciso: number): Observable<PerfilOrganismo> {
    return this.api.get<PerfilOrganismo>(`organismos/${inciso}/perfil`);
  }
}
