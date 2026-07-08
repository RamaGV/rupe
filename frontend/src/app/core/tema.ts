// src/app/core/tema.ts
import { Service, signal, effect } from '@angular/core';

const CLAVE = 'rupe-tema';

// Tema claro/oscuro: preferencia del usuario en localStorage, con el
// sistema operativo como default la primera vez. La clase .dark en
// <html> dispara las variables de styles.css — los componentes no
// saben que existe un tema.
@Service()
export class Tema {
  oscuro = signal<boolean>(this.inicial());

  constructor() {
    effect(() => {
      document.documentElement.classList.toggle('dark', this.oscuro());
      localStorage.setItem(CLAVE, this.oscuro() ? 'oscuro' : 'claro');
    });
  }

  alternar(): void {
    this.oscuro.set(!this.oscuro());
  }

  private inicial(): boolean {
    const guardado = localStorage.getItem(CLAVE);
    if (guardado) return guardado === 'oscuro';
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
  }
}
