// src/app/features/alertas/alertas-page/alertas-page.ts
import { Component, OnInit, inject, signal } from '@angular/core';
import { AlertasApi, Alerta } from '../alertas-api';
import { TIPOS_CONTRATACION } from '../../licitaciones/licitaciones-api';
import { OrganismosApi, OrganismoCodiguera } from '../../../core/organismos-api';

import { Skeleton } from '../../../core/ui/skeleton';

@Component({
  selector: 'app-alertas-page',
  standalone: true,
  imports: [Skeleton],
  templateUrl: './alertas-page.html',
})
export class AlertasPage implements OnInit {
  private alertasApi = inject(AlertasApi);
  private organismosApi = inject(OrganismosApi);

  alertas = signal<Alerta[]>([]);
  cargando = signal(true);
  error = signal<string | null>(null);
  guardando = signal(false);

  // Formulario de creación: campos simples, el armado del shape de
  // criterios (strings con comas → arrays) vive en crear().
  nombre = signal('');
  palabrasClave = signal('');
  incisoSeleccionado = signal(''); // código de inciso elegido del selector
  tipoSeleccionado = signal('');
  tipoAlerta = signal('nuevo_llamado');

  tiposContratacion = TIPOS_CONTRATACION;
  organismos = signal<OrganismoCodiguera[]>([]);

  // Espejo de los tipos CON MOTOR en el backend (adjudicación no se
  // ofrece: sus datos llegan por el dump anual, avisaría un año tarde)
  tiposAlerta = [
    { valor: 'nuevo_llamado', etiqueta: '🔔 Cuando se publique un llamado nuevo' },
    { valor: 'vencimiento', etiqueta: '⏰ Cuando algo que matchea cierre en menos de 48h' },
  ];

  etiquetaTipo(tipo: string): string {
    return tipo === 'vencimiento' ? '⏰ vencimiento' : '🔔 nuevo llamado';
  }

  ngOnInit(): void {
    this.cargar();
    this.organismosApi.getOrganismos().subscribe({
      next: (organismos) => this.organismos.set(organismos),
      error: () => {}, // sin codiguera solo se pierde el selector
    });
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
    // "terminal, obra" → ["terminal", "obra"]
    const palabrasClave = this.aLista(this.palabrasClave());
    // el criterio sigue siendo number[] (la API acepta varios); la UI
    // ofrece UNO por simplicidad — el caso real dominante
    const inciso = parseInt(this.incisoSeleccionado(), 10);
    const incisos = Number.isInteger(inciso) && inciso > 0 ? [inciso] : [];
    const tiposContratacion = this.tipoSeleccionado() ? [this.tipoSeleccionado()] : [];

    this.guardando.set(true);
    this.alertasApi
      .crearAlerta(
        this.nombre().trim(),
        {
          ...(palabrasClave.length && { palabrasClave }),
          ...(incisos.length && { incisos }),
          ...(tiposContratacion.length && { tiposContratacion }),
        },
        this.tipoAlerta(),
      )
      .subscribe({
        next: () => {
          this.nombre.set('');
          this.palabrasClave.set('');
          this.incisoSeleccionado.set('');
          this.tipoSeleccionado.set('');
          this.tipoAlerta.set('nuevo_llamado');
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
        this.incisoSeleccionado().length > 0 ||
        this.tipoSeleccionado().length > 0)
    );
  }

  // para la tabla: el criterio guarda códigos, el ojo quiere nombres
  nombresIncisos(codigos: number[]): string {
    const porCodigo = new Map(this.organismos().map((o) => [o.inciso, o.nombre]));
    return codigos.map((c) => porCodigo.get(c) ?? `inciso ${c}`).join(', ');
  }

  private aLista(texto: string): string[] {
    return texto
      .split(',')
      .map((p) => p.trim())
      .filter((p) => p.length > 0);
  }
}
