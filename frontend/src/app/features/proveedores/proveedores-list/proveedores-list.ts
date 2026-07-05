// src/app/features/proveedores/proveedores-list/proveedores-list.ts
import { Component, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged, switchMap, catchError, of } from 'rxjs';
import { ProveedoresApi, PaginaProveedores } from '../proveedores-api';

import { Skeleton } from '../../../core/ui/skeleton';

@Component({
  selector: 'app-proveedores-list',
  standalone: true,
  imports: [RouterLink, Skeleton],
  templateUrl: './proveedores-list.html',
  styleUrl: './proveedores-list.css',
})
export class ProveedoresList implements OnInit {
  private proveedoresApi = inject(ProveedoresApi);

  pagina = signal<PaginaProveedores | null>(null);
  cargando = signal(true);
  error = signal<string | null>(null);

  // Término de búsqueda vigente (lo usa la paginación para no perder el filtro)
  private texto = '';

  // Subject = flujo de lo que el usuario tipea. El pipe lo convierte en
  // "buscá en el backend, pero con modales":
  //   debounceTime(300)      → esperá a que deje de tipear 300ms
  //   distinctUntilChanged() → si el término no cambió, no repitas la query
  //   switchMap(...)         → si llega un término nuevo con una búsqueda
  //                            en vuelo, CANCELÁ la vieja (evita que una
  //                            respuesta lenta y vieja pise a la nueva)
  private busqueda$ = new Subject<string>();

  constructor() {
    this.busqueda$
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((texto) => {
          this.texto = texto;
          this.cargando.set(true);
          return this.proveedoresApi.buscar(1, 20, texto).pipe(
            // catchError DENTRO del switchMap: si una búsqueda falla,
            // muere esa búsqueda, no el flujo entero de tipeo
            catchError(() => {
              this.error.set('Error buscando proveedores');
              return of(null);
            }),
          );
        }),
        takeUntilDestroyed(), // desuscribe solo al destruir el componente
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
  }

  onBuscar(valor: string): void {
    this.busqueda$.next(valor);
  }

  cargar(page: number): void {
    this.cargando.set(true);
    this.proveedoresApi.buscar(page, 20, this.texto).subscribe({
      next: (data) => {
        this.pagina.set(data);
        this.error.set(null);
        this.cargando.set(false);
      },
      error: () => {
        this.error.set('Error cargando proveedores');
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
}
