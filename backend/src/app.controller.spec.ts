// backend/src/app.controller.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { getConnectionToken } from '@nestjs/mongoose';
import { AppController } from './app.controller';
import { AppService } from './app.service';

// El health check diagnostica la conexión a Mongo: acá se la inyectamos
// falsa en sus dos estados. El res es passthrough: solo capturamos el code.
function armarController(conexion: unknown) {
  return Test.createTestingModule({
    controllers: [AppController],
    providers: [
      AppService,
      { provide: getConnectionToken(), useValue: conexion },
    ],
  }).compile();
}

function resFalso() {
  const res = { codigo: 200, status(c: number) { this.codigo = c; return this; } };
  return res;
}

describe('AppController /health', () => {
  it('devuelve ok (200) cuando Mongo responde el ping', async () => {
    const app: TestingModule = await armarController({
      readyState: 1,
      db: { admin: () => ({ ping: async () => ({ ok: 1 }) }) },
    });
    const res = resFalso();

    const salud = await app.get(AppController).getHealth(res as never);

    expect(salud.status).toBe('ok');
    expect(salud.mongo).toBe('ok');
    expect(res.codigo).toBe(200);
    expect(new Date(salud.timestamp).toString()).not.toBe('Invalid Date');
  });

  it('devuelve degradado (503) cuando no hay conexión', async () => {
    const app: TestingModule = await armarController({ readyState: 0 });
    const res = resFalso();

    const salud = await app.get(AppController).getHealth(res as never);

    expect(salud.status).toBe('degradado');
    expect(salud.mongo).toBe('sin conexion');
    expect(res.codigo).toBe(503);
  });

  it('devuelve degradado si el ping REVIENTA (readyState mentiroso)', async () => {
    const app: TestingModule = await armarController({
      readyState: 1,
      db: { admin: () => ({ ping: async () => { throw new Error('socket cerrado'); } }) },
    });
    const res = resFalso();

    const salud = await app.get(AppController).getHealth(res as never);

    expect(salud.status).toBe('degradado');
    expect(res.codigo).toBe(503);
  });
});
