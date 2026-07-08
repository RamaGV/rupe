// src/app/app.config.ts

import { ApplicationConfig, provideZonelessChangeDetection } from '@angular/core';
import { provideRouter, withComponentInputBinding, TitleStrategy, RouterStateSnapshot } from '@angular/router';
import { Injectable } from '@angular/core';
import { Title } from '@angular/platform-browser';

// "Radar de precios · Boletín de Contrataciones" en cada pestaña:
// el title de la ruta + la marca, en un solo lugar.
@Injectable()
class TituloConMarca extends TitleStrategy {
  constructor(private readonly title: Title) { super(); }
  override updateTitle(snapshot: RouterStateSnapshot): void {
    const titulo = this.buildTitle(snapshot);
    this.title.setTitle(titulo ? `${titulo} · Boletín de Contrataciones` : 'Boletín de Contrataciones del Estado');
  }
}
import { provideHttpClient } from '@angular/common/http';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZonelessChangeDetection(),
    // withComponentInputBinding: los parámetros de ruta (ej :id) se
    // enlazan automáticamente a los input() del componente — sin
    // inyectar ActivatedRoute a mano.
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(),
    { provide: TitleStrategy, useClass: TituloConMarca },
  ],
};