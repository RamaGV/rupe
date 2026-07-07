// src/app/features/organismos/perfil-organismo/perfil-organismo.ts
import { Component, inject, input, effect, signal } from '@angular/core';
import { SlicePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { OrganismosPerfilApi, PerfilOrganismo } from '../organismos-perfil-api';
import { MontoPipe } from '../../../core/pipes/monto.pipe';
import { Skeleton } from '../../../core/ui/skeleton';

@Component({
  selector: 'app-perfil-organismo',
  standalone: true,
  imports: [RouterLink, SlicePipe, MontoPipe, Skeleton],
  templateUrl: './perfil-organismo.html',
})
export class PerfilOrganismoView {
  private perfilApi = inject(OrganismosPerfilApi);

  // :inciso llega como input() por withComponentInputBinding
  inciso = input.required<string>();

  perfil = signal<PerfilOrganismo | null>(null);
  cargando = signal(true);
  error = signal<string | null>(null);

  constructor() {
    // reactivo al input: navegar de un organismo a otro recarga solo
    effect(() => {
      const inciso = parseInt(this.inciso(), 10);
      if (!inciso) return;
      this.cargando.set(true);
      this.perfilApi.getPerfil(inciso).subscribe({
        next: (perfil) => {
          this.perfil.set(perfil);
          this.error.set(null);
          this.cargando.set(false);
        },
        error: () => {
          this.error.set('No hay datos de este organismo');
          this.cargando.set(false);
        },
      });
    });
  }
}
