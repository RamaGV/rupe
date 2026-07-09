// src/app/app.routes.ts
import { Routes } from '@angular/router';
import { ProveedoresList } from './features/proveedores/proveedores-list/proveedores-list';
import { LicitacionesList } from './features/licitaciones/licitaciones-list/licitaciones-list';
import { LicitacionDetail } from './features/licitaciones/licitacion-detail/licitacion-detail';
import { PerfilEmpresaView } from './features/proveedores/perfil-empresa/perfil-empresa';
import { AlertasPage } from './features/alertas/alertas-page/alertas-page';
import { NotificacionesPage } from './features/alertas/notificaciones-page/notificaciones-page';
import { Dashboard } from './features/dashboard/dashboard';
import { PerfilOrganismoView } from './features/organismos/perfil-organismo/perfil-organismo';
import { RadarPage } from './features/radar/radar-page';
import { Metodologia } from './features/metodologia/metodologia';
import { Glosario } from './features/glosario/glosario';
import { GuardadasPage } from './features/guardadas/guardadas-page';
import { BanderasPage } from './features/banderas/banderas-page';
import { SemanaPage } from './features/semana/semana-page';

export const routes: Routes = [
  // la portada: números generales del boletín (antes redirigía a la lista)
  { path: '', component: Dashboard, pathMatch: 'full', title: 'Inicio' },
  { path: 'licitaciones', component: LicitacionesList, title: 'Licitaciones' },
  // :id se enlaza al input "id" del componente (withComponentInputBinding)
  { path: 'licitaciones/:id', component: LicitacionDetail, title: 'Detalle del llamado' },
  { path: 'proveedores', component: ProveedoresList, title: 'Proveedores' },
  { path: 'proveedores/:documento', component: PerfilEmpresaView, title: 'Perfil de empresa' },
  // :inciso se enlaza al input "inciso" (withComponentInputBinding)
  { path: 'organismos/:inciso', component: PerfilOrganismoView, title: 'Perfil de organismo' },
  { path: 'radar', component: RadarPage, title: 'Radar de precios' },
  { path: 'alertas', component: AlertasPage, title: 'Mis alertas' },
  { path: 'notificaciones', component: NotificacionesPage, title: 'Notificaciones' },
  { path: 'metodologia', component: Metodologia, title: 'Metodología' },
  { path: 'glosario', component: Glosario, title: 'Glosario' },
  { path: 'guardadas', component: GuardadasPage, title: 'Guardadas' },
];