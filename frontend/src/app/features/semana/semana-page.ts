// src/app/features/semana/semana-page.ts
import { Component, OnInit, inject, signal } from '@angular/core';
import { SlicePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Api } from '../../core/api';
import { FechaRelativaPipe } from '../../core/pipes/fecha-relativa.pipe';
import { Skeleton } from '../../core/ui/skeleton';

export interface ResumenSemanal {
  desde: string;
  hasta: string;
  nuevos: number;
  topOrganismos: { nombre: string; cantidad: number }[];
  ultimosNuevos: { id: string; numeroCompra: string; descripcion: string; organismo: string; tipo: string }[];
  cierranPronto: { id: string; numeroCompra: string; descripcion: string; organismo: string; fechaRecepcionOfertas: string }[];
}

@Component({
  selector: 'app-semana-page',
  standalone: true,
  imports: [RouterLink, SlicePipe, FechaRelativaPipe, Skeleton],
  templateUrl: './semana-page.html',
})
export class SemanaPage implements OnInit {
  private api = inject(Api);
  resumen = signal<ResumenSemanal | null>(null);
  cargando = signal(true);
  error = signal<string | null>(null);

  ngOnInit(): void {
    this.api.get<ResumenSemanal>('estadisticas/semana').subscribe({
      next: (r) => { this.resumen.set(r); this.cargando.set(false); },
      error: () => { this.error.set('Error cargando el resumen'); this.cargando.set(false); },
    });
  }
}
