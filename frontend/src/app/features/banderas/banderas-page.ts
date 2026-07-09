// src/app/features/banderas/banderas-page.ts
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Api } from '../../core/api';
import { MontoPipe } from '../../core/pipes/monto.pipe';
import { Skeleton } from '../../core/ui/skeleton';

export interface BanderasRojas {
  fraccionamiento: { inciso: number; organismo: string; documento: string; proveedor: string; anio: number; compras: number; totalUYU: number }[];
  monoOrganismo: { documento: string; proveedor: string; adjudicaciones: number; organismo: string }[];
  directasGrandes: { licitacionId: string; descripcion: string; anio: number; organismo: string; proveedor?: string; documento?: string; montoUYU: number }[];
}

@Component({
  selector: 'app-banderas-page',
  standalone: true,
  imports: [RouterLink, MontoPipe, Skeleton],
  templateUrl: './banderas-page.html',
})
export class BanderasPage implements OnInit {
  private api = inject(Api);
  datos = signal<BanderasRojas | null>(null);
  cargando = signal(true);
  error = signal<string | null>(null);

  ngOnInit(): void {
    this.api.get<BanderasRojas>('banderas-rojas').subscribe({
      next: (datos) => { this.datos.set(datos); this.cargando.set(false); },
      error: () => { this.error.set('Error cargando el análisis'); this.cargando.set(false); },
    });
  }
}
