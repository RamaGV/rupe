// src/app/features/dashboard/dashboard.ts
import { Component, OnInit, inject, signal, effect, viewChild, ElementRef } from '@angular/core';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);
import { RouterLink } from '@angular/router';
import { SlicePipe } from '@angular/common';
import { DashboardApi, Estadisticas } from './dashboard-api';
import { MontoPipe } from '../../core/pipes/monto.pipe';
import { Skeleton } from '../../core/ui/skeleton';

const ANIO_ACTUAL = new Date().getFullYear();

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink, SlicePipe, MontoPipe, Skeleton],
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

  // El gráfico se redibuja REACTIVAMENTE: el effect corre cuando cambian
  // stats() o aparece el canvas (viewChild es signal) — sin hooks de
  // ciclo de vida ni timing manual, el patrón zoneless de la casa.
  private canvasEvolucion = viewChild<ElementRef<HTMLCanvasElement>>('evolucion');
  private canvasTipos = viewChild<ElementRef<HTMLCanvasElement>>('tipos');
  private grafico?: Chart;
  private donaTipos?: Chart;

  constructor() {
    effect(() => {
      const s = this.stats();
      const canvasDona = this.canvasTipos()?.nativeElement;
      if (s?.porTipo?.length && canvasDona) {
        this.donaTipos?.destroy();
        this.donaTipos = new Chart(canvasDona, {
          type: 'doughnut',
          data: {
            labels: s.porTipo.map((t) => t.tipo),
            datasets: [{ data: s.porTipo.map((t) => t.cantidad) }],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'right' } },
          },
        });
      }

      const canvas = this.canvasEvolucion()?.nativeElement;
      if (!s?.evolucionMensual?.length || !canvas) return;

      this.grafico?.destroy();
      this.grafico = new Chart(canvas, {
        data: {
          labels: s.evolucionMensual.map((p) => p.mes),
          datasets: [
            {
              type: 'bar',
              label: 'Llamados publicados',
              data: s.evolucionMensual.map((p) => p.llamados),
              backgroundColor: 'rgba(59, 130, 246, 0.5)',
              yAxisID: 'y',
            },
            {
              type: 'line',
              label: 'Adjudicado (millones UYU)',
              data: s.evolucionMensual.map((p) => p.montoUYU / 1_000_000),
              borderColor: 'rgb(22, 163, 74)',
              tension: 0.3,
              yAxisID: 'y2',
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: { position: 'left', title: { display: true, text: 'llamados' } },
            y2: {
              position: 'right',
              grid: { drawOnChartArea: false },
              title: { display: true, text: 'millones UYU' },
            },
          },
        },
      });
    });
  }

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
