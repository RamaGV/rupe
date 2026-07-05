// src/app/features/licitaciones/licitacion-detail/licitacion-detail.ts
import { Component, OnInit, inject, input, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { MontoPipe } from '../../../core/pipes/monto.pipe';
import { RouterLink } from '@angular/router';
import { LicitacionesApi, Licitacion } from '../licitaciones-api';

@Component({
  selector: 'app-licitacion-detail',
  standalone: true,
  imports: [DatePipe, DecimalPipe, RouterLink, MontoPipe],
  templateUrl: './licitacion-detail.html',
  styleUrl: './licitacion-detail.css',
})
export class LicitacionDetail implements OnInit {
  private licitacionesApi = inject(LicitacionesApi);

  // withComponentInputBinding() (app.config) enlaza el :id de la ruta
  // directo a este input — sin inyectar ActivatedRoute ni suscribirse
  // a params. El router escribe el input, nosotros lo leemos como signal.
  id = input.required<string>();

  licitacion = signal<Licitacion | null>(null);
  cargando = signal(true);
  error = signal<string | null>(null);

  ngOnInit(): void {
    this.licitacionesApi.getPorId(this.id()).subscribe({
      next: (data) => {
        this.licitacion.set(data);
        this.cargando.set(false);
      },
      error: (err) => {
        // El backend ahora responde 404 con shape consistente
        // ({ mensajes: [...] }) gracias al exception filter global
        this.error.set(
          err.status === 404
            ? `No existe la licitación "${this.id()}"`
            : `Error cargando la licitación (${err.status ?? 'sin conexión'})`,
        );
        this.cargando.set(false);
      },
    });
  }

  // Colores de badge por estado del llamado
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
