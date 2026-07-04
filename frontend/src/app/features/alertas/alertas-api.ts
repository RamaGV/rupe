// frontend/src/app/features/alertas/alertas-api.ts
import { Service, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Api } from '../../core/api';

// Copia manual del contrato del backend (shared/types/alerta.types.ts).
// Solo los criterios CONSTRUIBLES hoy: monto y familias existen en el
// dominio pero el RSS no los trae, así que el backend no los acepta.
export interface CriteriosAlerta {
  palabrasClave?: string[];
  incisos?: number[];
  tiposContratacion?: string[];
}

export interface Alerta {
  id: string;
  nombre: string;
  tipo: string; // hoy siempre "nuevo_llamado"
  criterios: CriteriosAlerta;
  activa: boolean;
  creadaEn: string;
}

export interface NotificacionAlerta {
  id: string;
  alertaId: string;
  alertaNombre: string;
  licitacionId: string; // navegable a /licitaciones/:id
  descripcion: string;
  organismo: string;
  tipoContratacion: string;
  fechaRecepcionOfertas?: string;
  leida: boolean;
  creadaEn: string;
}

export interface BandejaNotificaciones {
  sinLeer: number;
  datos: NotificacionAlerta[];
}

@Service()
export class AlertasApi {
  private api = inject(Api);

  crearAlerta(nombre: string, criterios: CriteriosAlerta): Observable<Alerta> {
    return this.api.post<Alerta>('alertas', { nombre, criterios });
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
