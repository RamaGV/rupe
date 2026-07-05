// src/app/core/ui/skeleton.ts
import { Component, input } from '@angular/core';

// Placeholder de carga con la FORMA de lo que viene (tabla, tarjetas o
// líneas de texto): el ojo ya sabe dónde va a aparecer cada cosa y la
// página no "salta" cuando llegan los datos. animate-pulse de Tailwind
// hace el latido; acá solo se dibujan barras grises.
//
//   @if (cargando()) { <app-skeleton tipo="tabla" [filas]="8" /> }
@Component({
  selector: 'app-skeleton',
  standalone: true,
  templateUrl: './skeleton.html',
})
export class Skeleton {
  tipo = input<'tabla' | 'tarjetas' | 'lineas'>('lineas');
  filas = input(5);

  // Array dummy para el @for (no hay range() en los templates)
  get items(): number[] {
    return Array.from({ length: this.filas() }, (_, i) => i);
  }
}
