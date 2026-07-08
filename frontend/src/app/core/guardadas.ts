// src/app/core/guardadas.ts
import { Service, signal, effect } from '@angular/core';

export interface LicitacionGuardada {
  id: string;
  numeroCompra: string;
  descripcion: string;
}

const CLAVE = 'rupe-guardadas';

// Watchlist SIN cuenta: vive en localStorage con un snapshot mínimo
// (id + número + descripción) — la página de guardadas renderiza sin
// pegarle al backend, y el detalle completo está a un click.
@Service()
export class Guardadas {
  lista = signal<LicitacionGuardada[]>(this.cargar());

  constructor() {
    effect(() => localStorage.setItem(CLAVE, JSON.stringify(this.lista())));
  }

  tiene(id: string): boolean {
    return this.lista().some((g) => g.id === id);
  }

  alternar(item: LicitacionGuardada): void {
    this.lista.set(
      this.tiene(item.id)
        ? this.lista().filter((g) => g.id !== item.id)
        : [item, ...this.lista()],
    );
  }

  private cargar(): LicitacionGuardada[] {
    try {
      return JSON.parse(localStorage.getItem(CLAVE) ?? '[]');
    } catch {
      return [];
    }
  }
}
