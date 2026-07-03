// src/app/app.routes.ts
import { Routes } from '@angular/router';
import { ProveedoresList } from './features/proveedores/proveedores-list/proveedores-list';
import { LicitacionesList } from './features/licitaciones/licitaciones-list/licitaciones-list';
import { LicitacionDetail } from './features/licitaciones/licitacion-detail/licitacion-detail';
import { PerfilEmpresaView } from './features/proveedores/perfil-empresa/perfil-empresa';

export const routes: Routes = [
  { path: 'licitaciones', component: LicitacionesList },
  // :id se enlaza al input "id" del componente (withComponentInputBinding)
  { path: 'licitaciones/:id', component: LicitacionDetail },
  { path: 'proveedores', component: ProveedoresList },
  { path: 'proveedores/:documento', component: PerfilEmpresaView },
  { path: '', redirectTo: 'licitaciones', pathMatch: 'full' },
];