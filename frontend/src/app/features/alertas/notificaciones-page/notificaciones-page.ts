// src/app/features/alertas/notificaciones-page/notificaciones-page.ts
import { Component, OnInit, inject, signal } from '@angular/core';
import { SlicePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AlertasApi, BandejaNotificaciones } from '../alertas-api';

import { Skeleton } from '../../../core/ui/skeleton';

@Component({
  selector: 'app-notificaciones-page',
  standalone: true,
  imports: [RouterLink, SlicePipe, Skeleton],
  templateUrl: './notificaciones-page.html',
})
export class NotificacionesPage implements OnInit {
  private alertasApi = inject(AlertasApi);

  bandeja = signal<BandejaNotificaciones | null>(null);
  cargando = signal(true);
  error = signal<string | null>(null);
  soloNoLeidas = signal(false);

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.alertasApi.listarNotificaciones(this.soloNoLeidas()).subscribe({
      next: (bandeja) => {
        this.bandeja.set(bandeja);
        this.cargando.set(false);
      },
      error: () => {
        this.error.set('Error cargando las notificaciones');
        this.cargando.set(false);
      },
    });
  }

  toggleFiltro(): void {
    this.soloNoLeidas.set(!this.soloNoLeidas());
    this.cargar();
  }

  marcarLeida(id: string): void {
    this.alertasApi.marcarLeida(id).subscribe({
      next: () => this.cargar(),
      error: () => this.error.set('Error marcando la notificación'),
    });
  }
}
