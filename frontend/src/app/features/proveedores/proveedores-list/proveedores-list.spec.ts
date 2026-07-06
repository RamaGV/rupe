// El TestBed replica lo mínimo de app.config.ts que el componente necesita:
// zoneless (la app corre sin Zone.js, los tests también deben hacerlo),
// HttpClient de TESTING (intercepta las requests: ninguna sale a la red)
// y un router vacío (el template usa routerLink).
import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { ProveedoresList } from './proveedores-list';
import { PaginaProveedores } from '../proveedores-api';
import { environment } from '../../../../environments/environment';

// Página de respuesta con la forma real del backend (GET /proveedores)
const PAGINA: PaginaProveedores = {
  datos: [
    {
      tipoDocumento: 'RUT',
      numeroDocumento: '214365280014',
      razonSocial: 'EMPRESA DE PRUEBA S.A.',
      estado: 'ACTIVO',
      pais: 'Uruguay',
      urlOrigen: 'file://test.csv',
    },
  ],
  total: 1,
  page: 1,
  totalPaginas: 1,
};

describe('ProveedoresList', () => {
  let component: ProveedoresList;
  let fixture: ComponentFixture<ProveedoresList>;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProveedoresList],
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProveedoresList);
    component = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    // Falla si quedó alguna request sin contestar: detecta llamadas de más
    http.verify();
  });

  it('pide la primera página al iniciar y la muestra', async () => {
    fixture.detectChanges(); // dispara ngOnInit → cargar(1)

    const req = http.expectOne(`${environment.apiUrl}/proveedores?page=1&limit=20`);
    expect(req.request.method).toBe('GET');
    req.flush(PAGINA);
    await fixture.whenStable();

    expect(component.pagina()?.total).toBe(1);
    expect(component.cargando()).toBe(false);
    expect(component.error()).toBeNull();
  });

  it('muestra el error si el backend falla (y deja de cargar)', async () => {
    fixture.detectChanges();

    http
      .expectOne(`${environment.apiUrl}/proveedores?page=1&limit=20`)
      .flush('boom', { status: 500, statusText: 'Internal Server Error' });
    await fixture.whenStable();

    expect(component.error()).toBe('Error cargando proveedores');
    expect(component.cargando()).toBe(false);
  });
});
