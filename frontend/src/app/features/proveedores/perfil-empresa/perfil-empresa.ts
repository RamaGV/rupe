// src/app/features/proveedores/perfil-empresa/perfil-empresa.ts
import { Component, OnInit, inject, input, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MontoPipe } from '../../../core/pipes/monto.pipe';
import { RouterLink } from '@angular/router';
import { ProveedoresApi, PerfilEmpresa } from '../proveedores-api';

import { Skeleton } from '../../../core/ui/skeleton';

@Component({
  selector: 'app-perfil-empresa',
  standalone: true,
  imports: [DatePipe, RouterLink, MontoPipe, Skeleton],
  templateUrl: './perfil-empresa.html',
  styleUrl: './perfil-empresa.css',
})
export class PerfilEmpresaView implements OnInit {
  private proveedoresApi = inject(ProveedoresApi);

  // :documento de la ruta, enlazado por withComponentInputBinding
  documento = input.required<string>();

  perfil = signal<PerfilEmpresa | null>(null);
  cargando = signal(true);
  error = signal<string | null>(null);

  ngOnInit(): void {
    this.proveedoresApi.getPerfil(this.documento()).subscribe({
      next: (data) => {
        this.perfil.set(data);
        this.cargando.set(false);
      },
      error: (err) => {
        this.error.set(
          err.status === 404
            ? `No hay datos del proveedor ${this.documento()}`
            : `Error cargando el perfil (${err.status ?? 'sin conexión'})`,
        );
        this.cargando.set(false);
      },
    });
  }
}
