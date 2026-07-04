// Spec del shell raíz. Mismo criterio que proveedores-list.spec.ts:
// el TestBed replica lo mínimo de app.config.ts (zoneless, HttpClient
// de testing para el health check, router vacío para los routerLink).
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

  it('crea el shell y muestra el estado del backend en la navbar', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges(); // dispara ngOnInit → GET /health

    http.expectOne(`${environment.apiUrl}/health`).flush({ status: 'ok' });
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Boletín de Contrataciones');
    expect(fixture.componentInstance.healthStatus()).toBe('ok');
  });

  it('reporta el error si el backend no responde el health check', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    http
      .expectOne(`${environment.apiUrl}/health`)
      .flush('down', { status: 503, statusText: 'Service Unavailable' });
    await fixture.whenStable();

    expect(fixture.componentInstance.healthStatus()).toBe('error conectando al backend');
  });
});
