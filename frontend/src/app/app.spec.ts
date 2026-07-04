// Spec del shell raíz. Mismo criterio que proveedores-list.spec.ts:
// el TestBed replica lo mínimo de app.config.ts (zoneless, HttpClient
// de testing para el health check y la campanita, router vacío).
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { App } from './app';
import { environment } from '../environments/environment';

describe('App', () => {
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    }).compileComponents();

    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  // El shell dispara DOS requests al crearse: GET /health (ngOnInit) y
  // GET /notificaciones?soloNoLeidas=true (el timer(0) de la campanita).
  // El setTimeout(0) le da lugar al timer a emitir antes del expectOne.
  async function flushArranque(salud = { status: 'ok' }, sinLeer = 0) {
    http.expectOne(`${environment.apiUrl}/health`).flush(salud);
    await new Promise((r) => setTimeout(r));
    http
      .expectOne(`${environment.apiUrl}/notificaciones?soloNoLeidas=true`)
      .flush({ sinLeer, datos: [] });
  }

  it('crea el shell y muestra el estado del backend en la navbar', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    await flushArranque();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Boletín de Contrataciones');
    expect(fixture.componentInstance.healthStatus()).toBe('ok');
  });

  it('muestra el contador de notificaciones sin leer en la campanita', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    await flushArranque({ status: 'ok' }, 3);
    await fixture.whenStable();

    expect(fixture.componentInstance.sinLeer()).toBe(3);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('3');
  });

  it('reporta el error si el backend no responde el health check', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    http
      .expectOne(`${environment.apiUrl}/health`)
      .flush('down', { status: 503, statusText: 'Service Unavailable' });
    await new Promise((r) => setTimeout(r));
    http
      .expectOne(`${environment.apiUrl}/notificaciones?soloNoLeidas=true`)
      .flush('down', { status: 503, statusText: 'Service Unavailable' });
    await fixture.whenStable();

    // la campanita falló pero no rompió nada: el contador queda en 0
    expect(fixture.componentInstance.healthStatus()).toBe('error conectando al backend');
    expect(fixture.componentInstance.sinLeer()).toBe(0);
  });
});
