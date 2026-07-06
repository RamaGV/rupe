// frontend/src/app/features/alertas/alertas-api.ts
import { Service, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Api } from '../../core/api';

// Derivados del dominio compartido (@rupe/shared).
import type {
  Alerta as AlertaDominio,
  CriteriosAlerta as CriteriosAlertaDominio,
  NotificacionAlerta as NotificacionDominio,
  Serializado,
} from '@rupe/shared';

export type Alerta = Serializado<AlertaDominio>;
export type CriteriosAlerta = Serializado<CriteriosAlertaDominio>;
export type NotificacionAlerta = Serializado<NotificacionDominio>;

export interface BandejaNotificaciones {
  sinLeer: number;
  datos: NotificacionAlerta[];
}

@Service()
export class AlertasApi {
  private api = inject(Api);

  crearAlerta(nombre: string, criterios: CriteriosAlerta, tipo: string): Observable<Alerta> {
    return this.api.post<Alerta>('alertas', { nombre, criterios, tipo });
  }

  listarAlertas(): Observable<Alerta[]> {
    return this.api.get<Alerta[]>('alertas');
  }

  actualizarAlerta(id: string, cambios: Partial<Pick<Alerta, 'nombre' | 'activa' | 'criterios'>>): Observable<Alerta> {
    return this.api.patch<Alerta>(`alertas/${id}`, cambios);
  }

  eliminarAlerta(id: string): Observable<void> {
    return this.api.delete<void>(`alertas/${id}`);
  }

  listarNotificaciones(soloNoLeidas = false): Observable<BandejaNotificaciones> {
    const filtro = soloNoLeidas ? '?soloNoLeidas=true' : '';
    return this.api.get<BandejaNotificaciones>(`notificaciones${filtro}`);
  }

  marcarLeida(id: string): Observable<void> {
    return this.api.patch<void>(`notificaciones/${id}/leida`, {});
  }
}
