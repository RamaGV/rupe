// src/app/features/proveedores/informe-empresa/informe-empresa.ts
//
// Informe descargable de una empresa. El "PDF" es window.print() sobre
// una vista optimizada para impresión (@media print en styles.css):
// cero dependencias de generación de PDF, y el navegador produce un
// documento impecable con "Guardar como PDF".
import { Component, inject, input, effect, signal } from '@angular/core';
import { DatePipe, SlicePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ProveedoresApi, PerfilEmpresa } from '../proveedores-api';
import { Api } from '../../../core/api';
import { MontoPipe } from '../../../core/pipes/monto.pipe';
import { Skeleton } from '../../../core/ui/skeleton';
import { environment } from '../../../../environments/environment';

interface FilaInforme {
  id: string; numeroCompra: string; anio: number; tipo: string; descripcion: string;
  organismo: { nombreInciso: string };
  adjudicacion?: { montoTotal?: number; moneda?: string; fechaAdjudicacion?: string };
}

@Component({
  selector: 'app-informe-empresa',
  standalone: true,
  imports: [RouterLink, DatePipe, SlicePipe, MontoPipe, Skeleton],
  templateUrl: './informe-empresa.html',
})
export class InformeEmpresa {
  private proveedoresApi = inject(ProveedoresApi);
  private api = inject(Api);

  documento = input.required<string>();
  perfil = signal<PerfilEmpresa | null>(null);
  filas = signal<FilaInforme[]>([]);
  cargando = signal(true);
  hoy = new Date();

  constructor() {
    effect(() => {
      const doc = this.documento();
      if (!doc) return;
      this.cargando.set(true);
      this.proveedoresApi.getPerfil(doc).subscribe({
        next: (p) => this.perfil.set(p),
        error: () => this.cargando.set(false),
      });
      this.api.get<FilaInforme[]>(`proveedores/${doc}/adjudicaciones`).subscribe({
        next: (filas) => { this.filas.set(filas); this.cargando.set(false); },
        error: () => this.cargando.set(false),
      });
    });
  }

  urlCsv(): string {
    return `${environment.apiUrl}/proveedores/${this.documento()}/adjudicaciones.csv`;
  }

  imprimir(): void {
    window.print();
  }
}
