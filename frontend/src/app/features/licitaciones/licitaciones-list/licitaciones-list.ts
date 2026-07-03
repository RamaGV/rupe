// src/app/features/licitaciones/licitaciones-list/licitaciones-list.ts
import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { LicitacionesApi, PaginaLicitaciones } from '../licitaciones-api';

@Component({
  selector: 'app-licitaciones-list',
  standalone: true,
  imports: [DatePipe, RouterLink],
  templateUrl: './licitaciones-list.html',
  styleUrl: './licitaciones-list.css',
})
export class LicitacionesList implements OnInit {
  private licitacionesApi = inject(LicitacionesApi);

  // Guardamos la página completa (datos + metadata de paginación) en un
  // solo signal: siempre llegan juntos del backend, separarlos en varios
  // signals solo agregaría estados intermedios inconsistentes.
  pagina = signal<PaginaLicitaciones | null>(null);
  cargando = signal(true);
  error = signal<string | null>(null);

  ngOnInit(): void {
    this.cargar(1);
  }

  cargar(page: number): void {
    this.cargando.set(true);
    this.error.set(null);
    this.licitacionesApi.buscar(page).subscribe({
      next: (data) => {
        this.pagina.set(data);
        this.cargando.set(false);
      },
      error: (err) => {
        this.error.set(`No se pudo cargar licitaciones (${err.status ?? 'sin conexión'})`);
        this.cargando.set(false);
      },
    });
  }

  anterior(): void {
    const p = this.pagina();
    if (p && p.page > 1) this.cargar(p.page - 1);
  }

  siguiente(): void {
    const p = this.pagina();
    if (p && p.page < p.totalPaginas) this.cargar(p.page + 1);
  }

  // Los llamados importados de sistemas externos (IM, OSE, ANCAP...) tienen
  // id con prefijo "i" — eran los 157 que fallaban en BUG-1.
  esImportado(id: string): boolean {
    return id.startsWith('i');
  }

  claseEstado(estado: string): string {
    switch (estado) {
      case 'vigente': return 'bg-green-100 text-green-700';
      case 'adjudicado': return 'bg-blue-100 text-blue-700';
      case 'desierto': return 'bg-gray-200 text-gray-600';
      case 'sin_efecto': return 'bg-red-100 text-red-600';
      default: return 'bg-gray-100 text-gray-600';
    }
  }
}
