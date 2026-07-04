// src/app/features/alertas/alertas-page/alertas-page.ts
import { Component, OnInit, inject, signal } from '@angular/core';
import { AlertasApi, Alerta } from '../alertas-api';
import { TIPOS_CONTRATACION } from '../../licitaciones/licitaciones-api';

@Component({
  selector: 'app-alertas-page',
  standalone: true,
  imports: [],
  templateUrl: './alertas-page.html',
})
export class AlertasPage implements OnInit {
  private alertasApi = inject(AlertasApi);

  alertas = signal<Alerta[]>([]);
  cargando = signal(true);
  error = signal<string | null>(null);
  guardando = signal(false);

  // Formulario de creación: campos simples, el armado del shape de
  // criterios (strings con comas → arrays) vive en crear().
  nombre = signal('');
  palabrasClave = signal('');
  incisos = signal('');
  tipoSeleccionado = signal('');

  tiposContratacion = TIPOS_CONTRATACION;

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.alertasApi.listarAlertas().subscribe({
      next: (alertas) => {
        this.alertas.set(alertas);
        this.cargando.set(false);
      },
      error: () => {
        this.error.set('Error cargando las alertas');
        this.cargando.set(false);
      },
    });
  }

  crear(): void {
    // "terminal, obra" → ["terminal", "obra"]; "98, 83" → [98, 83]
    const palabrasClave = this.aLista(this.palabrasClave());
    const incisos = this.aLista(this.incisos())
      .map(Number)
      .filter((n) => Number.isInteger(n) && n > 0);
    const tiposContratacion = this.tipoSeleccionado() ? [this.tipoSeleccionado()] : [];

    this.guardando.set(true);
    this.alertasApi
      .crearAlerta(this.nombre().trim(), {
        ...(palabrasClave.length && { palabrasClave }),
        ...(incisos.length && { incisos }),
        ...(tiposContratacion.length && { tiposContratacion }),
      })
      .subscribe({
        next: () => {
          this.nombre.set('');
          this.palabrasClave.set('');
          this.incisos.set('');
          this.tipoSeleccionado.set('');
          this.error.set(null);
          this.guardando.set(false);
          this.cargar();
        },
        error: (err) => {
          // el backend valida (400 si no hay criterios): mostramos SU mensaje
          this.error.set(err?.error?.mensajes?.join(' — ') ?? 'Error creando la alerta');
          this.guardando.set(false);
        },
      });
  }

  toggleActiva(alerta: Alerta): void {
    this.alertasApi.actualizarAlerta(alerta.id, { activa: !alerta.activa }).subscribe({
      next: () => this.cargar(),
      error: () => this.error.set('Error actualizando la alerta'),
    });
  }

  eliminar(alerta: Alerta): void {
    if (!confirm(`¿Borrar la alerta "${alerta.nombre}"?`)) return;
    this.alertasApi.eliminarAlerta(alerta.id).subscribe({
      next: () => this.cargar(),
      error: () => this.error.set('Error borrando la alerta'),
    });
  }

  puedeCrear(): boolean {
    return (
      this.nombre().trim().length > 0 &&
      (this.palabrasClave().trim().length > 0 ||
        this.incisos().trim().length > 0 ||
        this.tipoSeleccionado().length > 0)
    );
  }

  private aLista(texto: string): string[] {
    return texto
      .split(',')
      .map((p) => p.trim())
      .filter((p) => p.length > 0);
  }
}
