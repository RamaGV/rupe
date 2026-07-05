// src/app/features/licitaciones/licitaciones-list/licitaciones-list.ts
import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FechaRelativaPipe } from '../../../core/pipes/fecha-relativa.pipe';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged, switchMap, catchError, of } from 'rxjs';
import {
  LicitacionesApi,
  PaginaLicitaciones,
  FiltrosLicitaciones,
  ESTADOS_LLAMADO,
  TIPOS_CONTRATACION,
  ORDENES,
} from '../licitaciones-api';
import { OrganismosApi, OrganismoCodiguera } from '../../../core/organismos-api';

@Component({
  selector: 'app-licitaciones-list',
  standalone: true,
  imports: [DatePipe, RouterLink, FechaRelativaPipe],
  templateUrl: './licitaciones-list.html',
  styleUrl: './licitaciones-list.css',
})
export class LicitacionesList implements OnInit {
  private licitacionesApi = inject(LicitacionesApi);
  private organismosApi = inject(OrganismosApi);

  // opciones para los <select> del template
  readonly estados = ESTADOS_LLAMADO;
  readonly tipos = TIPOS_CONTRATACION;
  readonly ordenes = ORDENES;
  readonly anios = [2026, 2025, 2024, 2023, 2022];
  organismos = signal<OrganismoCodiguera[]>([]);

  pagina = signal<PaginaLicitaciones | null>(null);
  cargando = signal(true);
  error = signal<string | null>(null);

  // Filtros vigentes. Campos planos (no signals): no los muestra la UI,
  // solo alimentan la próxima query — la UI reacciona a `pagina`.
  private filtros: FiltrosLicitaciones = { orden: 'recientes' };

  // Texto con debounce (mismo patrón que proveedores); los <select>
  // disparan directo porque un cambio de select ya es una acción única.
  private busqueda$ = new Subject<string>();

  constructor() {
    this.busqueda$
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((texto) => {
          this.filtros.texto = texto || undefined;
          this.cargando.set(true);
          return this.licitacionesApi.buscar({ ...this.filtros, page: 1 }).pipe(
            catchError(() => {
              this.error.set('Error buscando licitaciones');
              return of(null);
            }),
          );
        }),
        takeUntilDestroyed(),
      )
      .subscribe((data) => {
        if (data) {
          this.pagina.set(data);
          this.error.set(null);
        }
        this.cargando.set(false);
      });
  }

  ngOnInit(): void {
    this.cargar(1);
    // referencia para el selector; si falla, el resto de la página vive igual
    this.organismosApi.getOrganismos().subscribe({
      next: (organismos) => this.organismos.set(organismos),
      error: () => {}, // sin codiguera solo se pierde el selector
    });
  }

  onBuscar(valor: string): void {
    this.busqueda$.next(valor);
  }

  onFiltro(campo: 'estado' | 'tipo' | 'orden' | 'anio' | 'inciso', valor: string): void {
    if (campo === 'anio' || campo === 'inciso') {
      this.filtros[campo] = valor ? parseInt(valor, 10) : undefined;
    } else {
      this.filtros[campo] = (valor || undefined) as never;
    }
    this.cargar(1); // cualquier cambio de filtro vuelve a la página 1
  }

  cargar(page: number): void {
    this.cargando.set(true);
    this.licitacionesApi.buscar({ ...this.filtros, page }).subscribe({
      next: (data) => {
        this.pagina.set(data);
        this.error.set(null);
        this.cargando.set(false);
      },
      error: () => {
        this.error.set('Error cargando licitaciones');
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
