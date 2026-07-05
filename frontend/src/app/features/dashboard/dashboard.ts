// src/app/features/dashboard/dashboard.ts
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SlicePipe } from '@angular/common';
import { DashboardApi, Estadisticas } from './dashboard-api';
import { MontoPipe } from '../../core/pipes/monto.pipe';

const ANIO_ACTUAL = new Date().getFullYear();

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink, SlicePipe, MontoPipe],
  templateUrl: './dashboard.html',
})
export class Dashboard implements OnInit {
  private dashboardApi = inject(DashboardApi);

  stats = signal<Estadisticas | null>(null);
  cargando = signal(true);
  error = signal<string | null>(null);

  // El marco de referencia por defecto es "este año". 0 = histórico.
  anio = signal(ANIO_ACTUAL);
  anioActual = ANIO_ACTUAL;
  aniosDisponibles = [ANIO_ACTUAL, ANIO_ACTUAL - 1, ANIO_ACTUAL - 2];

  ngOnInit(): void {
    this.cargar();
  }

  onAnio(valor: string): void {
    this.anio.set(parseInt(valor, 10) || 0);
    this.cargar();
  }

  private cargar(): void {
    this.cargando.set(true);
    this.dashboardApi.getEstadisticas(this.anio() || undefined).subscribe({
      next: (stats) => {
        this.stats.set(stats);
        this.cargando.set(false);
      },
      error: () => {
        this.error.set('Error cargando las estadísticas');
        this.cargando.set(false);
      },
    });
  }
}
