// src/app/app.config.ts

import { ApplicationConfig, provideZonelessChangeDetection } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
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
  ],
};