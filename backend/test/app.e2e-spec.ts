// backend/test/app.e2e-spec.ts
//
// e2e de la API completa: se levanta la app REAL (módulos, pipes, filter,
// prefijo — la misma configuración de main.ts) contra un MongoDB efímero
// (mongodb-memory-server): un mongod de verdad que nace vacío, se siembra
// con fixtures conocidas y muere al final. Aislado de la base de
// desarrollo y ejecutable en CI, donde el contenedor local no existe.
//
// El único provider que se reemplaza es RssSchedulerService: su
// OnModuleInit dispara la ingesta del RSS (red) — un e2e jamás debe
// depender de que ARCE esté en línea.

import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { RssSchedulerService } from '../src/licitaciones/rss-scheduler.service';
import { GlobalExceptionFilter } from '../src/shared/filters/global-exception.filter';
import { Licitacion } from '../src/licitaciones/schemas/licitacion.schema';
import { OrganismoCodiguera } from '../src/codigueras/schemas/organismo-codiguera.schema';
import { Proveedor } from '../src/ingesta/schemas/proveedor.schema';

// el primer arranque descarga el binario de mongod: margen generoso
jest.setTimeout(120_000);

const EN_5_DIAS = new Date(Date.now() + 5 * 86_400_000);

describe('API e2e', () => {
  let app: INestApplication;
  let mongod: MongoMemoryServer;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    // process.env pisa al .env de la raíz (@nestjs/config no sobreescribe
    // variables ya presentes en el ambiente)
    process.env.MONGODB_URI = mongod.getUri('rupe-e2e');

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(RssSchedulerService)
      .useValue({}) // sin onModuleInit ⇒ sin ingesta ni cron del RSS
      .compile();

    app = moduleRef.createNestApplication();
    // espejo de main.ts: el e2e prueba la app como corre en serio
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.useGlobalFilters(new GlobalExceptionFilter());
    await app.init();

    await sembrar();
  });

  afterAll(async () => {
    await app?.close();
    await mongod?.stop();
  });

  // Fixtures mínimas pero con los casos que importan: un vigente real,
  // un "vigente" RANCIO (cerró en 2016 — el bug que cazó el autor) y
  // un adjudicado que cruza con el proveedor sembrado.
  async function sembrar() {
    const licitacionModel = app.get(getModelToken(Licitacion.name));
    const organismoModel = app.get(getModelToken(OrganismoCodiguera.name));
    const proveedorModel = app.get(getModelToken(Proveedor.name));

    await licitacionModel.insertMany([
      {
        id: 'e2e-vigente', numeroCompra: '1/2026', anio: 2026,
        tipo: 'Licitación Abreviada', estado: 'vigente',
        organismo: { inciso: 83, nombreInciso: 'Intendencia de Colonia', unidadEjecutora: 'Intendencia de Colonia' },
        descripcion: 'Reparación de caminería rural',
        fechaPublicacion: new Date(), fechaRecepcionOfertas: EN_5_DIAS,
        urlOrigen: 'https://example.test/e2e-vigente', aperturaElectronica: false, items: [],
      },
      {
        id: 'e2e-rancio', numeroCompra: '3/2016', anio: 2016,
        tipo: 'Licitación Pública', estado: 'vigente', // la fuente dijo vigente...
        organismo: { inciso: 5, nombreInciso: 'Ministerio de Economía y Finanzas', unidadEjecutora: 'DNA' },
        descripcion: 'Permisos de explotación de depósito fiscal',
        fechaPublicacion: new Date('2016-11-24'),
        fechaRecepcionOfertas: new Date('2016-12-28'), // ...pero cerró en 2016
        urlOrigen: 'https://example.test/e2e-rancio', aperturaElectronica: false, items: [],
      },
      {
        id: 'e2e-adjudicado', numeroCompra: '2/2025', anio: 2025,
        tipo: 'Compra Directa', estado: 'adjudicado',
        organismo: { inciso: 53, nombreInciso: 'Banco de Seguros del Estado', unidadEjecutora: 'BSE' },
        descripcion: 'Servicio de limpieza de oficinas',
        fechaPublicacion: new Date('2025-03-01'),
        urlOrigen: 'https://example.test/e2e-adjudicado', aperturaElectronica: true, items: [],
        adjudicacion: {
          estado: 'Adjudicada totalmente',
          proveedor: { tipoDocumento: 'RUT', numeroDocumento: '214365280014', razonSocial: 'EMPRESA E2E S.A.' },
          montoTotal: 500000, moneda: 'Pesos Uruguayos', fechaAdjudicacion: new Date('2025-04-01'),
        },
      },
    ]);

    await organismoModel.create({
      inciso: 83, nombre: 'Intendencia de Colonia',
      nombreNormalizado: 'intendencia de colonia', unidadesEjecutoras: [],
    });

    await proveedorModel.create({
      numeroDocumento: '214365280014', tipoDocumento: 'RUT',
      razonSocial: 'EMPRESA E2E S.A.', estado: 'ACTIVO', pais: 'Uruguay',
      urlOrigen: 'file://e2e.csv',
    });
  }

  const api = () => request(app.getHttpServer());

  describe('/health', () => {
    it('reporta ok con el Mongo efímero conectado', async () => {
      const res = await api().get('/api/v1/health').expect(200);
      expect(res.body).toMatchObject({ status: 'ok', mongo: 'ok' });
    });
  });

  describe('/licitaciones', () => {
    it('devuelve la página con el shape del contrato y SIN campos internos', async () => {
      const res = await api().get('/api/v1/licitaciones').expect(200);

      expect(res.body).toMatchObject({ total: 3, page: 1 });
      const lic = res.body.datos[0];
      expect(lic._id).toBeUndefined();
      expect(lic.__v).toBeUndefined();
      expect(lic.fechaIngesta).toBeUndefined();
      expect(lic.createdAt).toBeUndefined();
      expect(lic.updatedAt).toBeUndefined();
    });

    it('estado=vigente significa "se puede ofertar hoy": excluye al rancio de 2016', async () => {
      const res = await api().get('/api/v1/licitaciones?estado=vigente').expect(200);

      expect(res.body.total).toBe(1);
      expect(res.body.datos[0].id).toBe('e2e-vigente');
    });

    it('filtra por inciso', async () => {
      const res = await api().get('/api/v1/licitaciones?inciso=53').expect(200);
      expect(res.body.total).toBe(1);
      expect(res.body.datos[0].id).toBe('e2e-adjudicado');
    });

    it('rechaza limit>100 con el shape único de error del filter', async () => {
      const res = await api().get('/api/v1/licitaciones?limit=500').expect(400);

      expect(res.body.statusCode).toBe(400);
      expect(Array.isArray(res.body.mensajes)).toBe(true);
      expect(res.body.ruta).toContain('/api/v1/licitaciones');
    });

    it('detalle por id trae la adjudicación; id inexistente da 404 con shape', async () => {
      const detalle = await api().get('/api/v1/licitaciones/e2e-adjudicado').expect(200);
      expect(detalle.body.adjudicacion.proveedor.numeroDocumento).toBe('214365280014');

      const noExiste = await api().get('/api/v1/licitaciones/nope').expect(404);
      expect(noExiste.body.statusCode).toBe(404);
      expect(Array.isArray(noExiste.body.mensajes)).toBe(true);
    });
  });

  describe('/organismos', () => {
    it('lista la codiguera', async () => {
      const res = await api().get('/api/v1/organismos').expect(200);
      expect(res.body).toEqual([{ inciso: 83, nombre: 'Intendencia de Colonia' }]);
    });
  });

  describe('/proveedores', () => {
    it('busca por texto y oculta fechaIngesta', async () => {
      const res = await api().get('/api/v1/proveedores?texto=e2e').expect(200);

      expect(res.body.total).toBe(1);
      expect(res.body.datos[0].razonSocial).toBe('EMPRESA E2E S.A.');
      expect(res.body.datos[0].fechaIngesta).toBeUndefined();
    });

    it('el perfil cruza RUPE con las adjudicaciones de Mongo', async () => {
      const res = await api().get('/api/v1/proveedores/214365280014/perfil').expect(200);

      expect(res.body.totalLicitacionesGanadas).toBe(1);
      expect(res.body.montosPorMoneda).toEqual([
        { moneda: 'Pesos Uruguayos', total: 500000, cantidad: 1 },
      ]);
    });
  });

  describe('/estadisticas', () => {
    it('resume con la MISMA derivación de vigente que la búsqueda', async () => {
      const res = await api().get('/api/v1/estadisticas').expect(200);

      expect(res.body.totalLicitaciones).toBe(3);
      expect(res.body.vigentes).toBe(1); // el rancio no cuenta
      expect(res.body.totalProveedores).toBe(1);
    });
  });

  describe('/alertas (CRUD completo)', () => {
    let alertaId: string;

    it('crea una alerta y devuelve el contrato público', async () => {
      const res = await api()
        .post('/api/v1/alertas')
        .send({ nombre: 'Caminería', criterios: { palabrasClave: ['caminería'] } })
        .expect(201);

      expect(res.body).toMatchObject({ nombre: 'Caminería', tipo: 'nuevo_llamado', activa: true });
      expect(typeof res.body.id).toBe('string');
      alertaId = res.body.id;
    });

    it('rechaza una alerta sin criterios (sería "avisame de todo")', async () => {
      const res = await api()
        .post('/api/v1/alertas')
        .send({ nombre: 'Vacía', criterios: {} })
        .expect(400);
      expect(res.body.mensajes.join(' ')).toContain('al menos un criterio');
    });

    it('pausa con PATCH y elimina con 204', async () => {
      const pausada = await api()
        .patch(`/api/v1/alertas/${alertaId}`)
        .send({ activa: false })
        .expect(200);
      expect(pausada.body.activa).toBe(false);

      await api().delete(`/api/v1/alertas/${alertaId}`).expect(204);
      const lista = await api().get('/api/v1/alertas').expect(200);
      expect(lista.body).toEqual([]);
    });

    it('la bandeja arranca vacía y con contador en cero', async () => {
      const res = await api().get('/api/v1/notificaciones').expect(200);
      expect(res.body).toEqual({ sinLeer: 0, datos: [] });
    });
  });
});
