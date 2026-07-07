// Mismo criterio que proveedores-list.spec.ts: TestBed mínimo de
// app.config.ts, HttpClient de testing y asserts sobre las requests
// REALES del componente (dispara DOS al iniciar: licitaciones + codiguera).
import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { LicitacionesList } from './licitaciones-list';
import { PaginaLicitaciones } from '../licitaciones-api';
import { environment } from '../../../../environments/environment';

const PAGINA: PaginaLicitaciones = {
  datos: [
    {
      id: 'e2e-1', numeroCompra: '1/2026', anio: 2026,
      tipo: 'Licitación Abreviada', estado: 'vigente', aperturaElectronica: false,
      organismo: { inciso: 83, nombreInciso: 'Intendencia de Colonia', unidadEjecutora: 'Intendencia de Colonia' },
      descripcion: 'Reparación de caminería rural', items: [],
      fechaPublicacion: '2026-07-01T10:00:00.000Z',
      fechaRecepcionOfertas: '2026-07-20T15:00:00.000Z',
      urlOrigen: 'https://example.test/1',
    },
  ],
  total: 1, page: 1, totalPaginas: 1,
};

describe('LicitacionesList', () => {
  let fixture: ComponentFixture<LicitacionesList>;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LicitacionesList],
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LicitacionesList);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  function flushArranque() {
    http
      .expectOne(`${environment.apiUrl}/licitaciones?orden=recientes&page=1`)
      .flush(PAGINA);
    http.expectOne(`${environment.apiUrl}/organismos`).flush([
      { inciso: 83, nombre: 'Intendencia de Colonia' },
    ]);
  }

  it('pide la primera página y la codiguera al iniciar, y muestra la fila', async () => {
    fixture.detectChanges();
    flushArranque();
    await fixture.whenStable();

    const texto = (fixture.nativeElement as HTMLElement).textContent!;
    expect(texto).toContain('Reparación de caminería rural');
    expect(texto).toContain('Intendencia de Colonia');
    expect(fixture.componentInstance.pagina()?.total).toBe(1);
  });

  it('el filtro por inciso viaja como número en la query y resetea a página 1', async () => {
    fixture.detectChanges();
    flushArranque();
    await fixture.whenStable();

    fixture.componentInstance.onFiltro('inciso', '83');
    http
      .expectOne(`${environment.apiUrl}/licitaciones?orden=recientes&inciso=83&page=1`)
      .flush(PAGINA);
    await fixture.whenStable();

    expect(fixture.componentInstance.cargando()).toBe(false);
  });

  it('si la codiguera falla, la lista vive igual (solo se pierde el selector)', async () => {
    fixture.detectChanges();
    http
      .expectOne(`${environment.apiUrl}/licitaciones?orden=recientes&page=1`)
      .flush(PAGINA);
    http
      .expectOne(`${environment.apiUrl}/organismos`)
      .flush('boom', { status: 500, statusText: 'Internal Server Error' });
    await fixture.whenStable();

    expect(fixture.componentInstance.pagina()?.total).toBe(1);
    expect(fixture.componentInstance.organismos()).toEqual([]);
  });
});
