// src/app/features/radar/radar-page.ts
import { Component, inject, signal, effect, viewChild, ElementRef } from '@angular/core';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);
import { SlicePipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged, filter, switchMap, catchError, of } from 'rxjs';
import { RadarApi, RadarPrecios } from './radar-api';
import { MontoPipe } from '../../core/pipes/monto.pipe';
import { Skeleton } from '../../core/ui/skeleton';

@Component({
  selector: 'app-radar-page',
  standalone: true,
  imports: [RouterLink, SlicePipe, MontoPipe, Skeleton],
  templateUrl: './radar-page.html',
})
export class RadarPage {
  private radarApi = inject(RadarApi);

  resultado = signal<RadarPrecios | null>(null);
  cargando = signal(false);
  error = signal<string | null>(null);
  buscado = signal(false); // distingue "todavía no buscaste" de "sin resultados"

  private busqueda$ = new Subject<string>();
  private canvasSerie = viewChild<ElementRef<HTMLCanvasElement>>('serie');
  private grafico?: Chart;

  constructor() {
    // la línea de precios se redibuja cuando llega un resultado nuevo
    effect(() => {
      const r = this.resultado();
      const canvas = this.canvasSerie()?.nativeElement;
      if (!r?.serieMensualUYU || r.serieMensualUYU.length < 2 || !canvas) return;
      this.grafico?.destroy();
      this.grafico = new Chart(canvas, {
        type: 'line',
        data: {
          labels: r.serieMensualUYU.map((p) => p.mes),
          datasets: [{
            label: 'Precio unitario promedio (UYU)',
            data: r.serieMensualUYU.map((p) => p.promedio),
            borderColor: 'rgb(22, 163, 74)',
            tension: 0.3,
          }],
        },
        options: { responsive: true, maintainAspectRatio: false },
      });
    });

    this.busqueda$
      .pipe(
        debounceTime(400),
        distinctUntilChanged(),
        filter((texto) => texto.trim().length >= 3), // espejo del MinLength del DTO
        switchMap((texto) => {
          this.cargando.set(true);
          this.buscado.set(true);
          return this.radarApi.buscar(texto.trim()).pipe(
            catchError(() => {
              this.error.set('Error consultando el radar');
              return of(null);
            }),
          );
        }),
        takeUntilDestroyed(),
      )
      .subscribe((resultado) => {
        if (resultado) {
          this.resultado.set(resultado);
          this.error.set(null);
        }
        this.cargando.set(false);
      });
  }

  onBuscar(valor: string): void {
    this.busqueda$.next(valor);
  }
}
