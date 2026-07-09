// src/app/features/comparador/comparador-page.ts
//
// Dos proveedores lado a lado. CERO backend nuevo: cada columna busca
// con el endpoint de proveedores y carga el perfil existente — el
// comparador es composición de lo que ya está.
import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ProveedoresApi, ProveedorRupe, PerfilEmpresa } from '../proveedores/proveedores-api';
import { MontoPipe } from '../../core/pipes/monto.pipe';

interface Lado {
  resultados: ReturnType<typeof signal<ProveedorRupe[]>>;
  perfil: ReturnType<typeof signal<PerfilEmpresa | null>>;
  cargando: ReturnType<typeof signal<boolean>>;
}

@Component({
  selector: 'app-comparador-page',
  standalone: true,
  imports: [RouterLink, MontoPipe],
  templateUrl: './comparador-page.html',
})
export class ComparadorPage {
  private proveedoresApi = inject(ProveedoresApi);

  lados: Lado[] = [0, 1].map(() => ({
    resultados: signal<ProveedorRupe[]>([]),
    perfil: signal<PerfilEmpresa | null>(null),
    cargando: signal(false),
  }));

  buscar(i: number, texto: string): void {
    if (texto.trim().length < 3) {
      this.lados[i].resultados.set([]);
      return;
    }
    this.proveedoresApi.buscar(1, 5, texto.trim()).subscribe({
      next: (p) => this.lados[i].resultados.set(p.datos),
      error: () => {},
    });
  }

  elegir(i: number, documento: string): void {
    this.lados[i].resultados.set([]);
    this.lados[i].cargando.set(true);
    this.proveedoresApi.getPerfil(documento).subscribe({
      next: (perfil) => {
        this.lados[i].perfil.set(perfil);
        this.lados[i].cargando.set(false);
      },
      error: () => this.lados[i].cargando.set(false),
    });
  }
}
