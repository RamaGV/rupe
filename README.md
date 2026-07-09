# Boletín de Contrataciones del Estado Uruguayo

[![CI](https://github.com/RamaGV/rupe/actions/workflows/ci.yml/badge.svg)](https://github.com/RamaGV/rupe/actions/workflows/ci.yml)

Sistema para **enterarse a tiempo** de las compras públicas uruguayas, con el
contexto histórico para evaluarlas: qué se licita hoy, quién compra, cuánto
paga y quién viene ganando.

## Qué hace

**24 años de datos** (2002–2025: ~600k llamados, ~1.3M adjudicaciones):

- **Dashboard interactivo** con selector de año y modo oscuro: actividad
  mensual, distribución por tipo, rankings navegables de organismos y
  proveedores — montos siempre POR MONEDA, nunca sumados entre monedas.
- **Radar de precios**: ¿a cuánto se le vendió un artículo al Estado?
  Mín/promedio/máx por moneda + evolución temporal + muestras reales.
- **Banderas rojas** 🚩: señales estadísticas (fraccionamiento, proveedores
  mono-organismo, compras directas millonarias) — puntos de partida para
  investigar, no acusaciones.
- **Perfiles cruzados**: empresa (con informe descargable en PDF y CSV) y
  organismo (con índice de concentración del gasto), navegables en círculo.
- **Alertas** 🔔⏰ con notificaciones push del navegador (pestaña cerrada),
  resumen semanal autogenerado, comparador de proveedores, watchlist ⭐,
  export CSV, glosario y metodología.

## Fuentes de datos (todas oficiales de ARCE)

| Fuente | Rol | Cadencia |
|---|---|---|
| RSS de comprasestatales.gub.uy | Llamados vigentes | cron cada 15 min |
| Dumps OCDS anuales | Histórico: adjudicaciones, items, precios | batch anual |
| CSV de RUPE | Registro de proveedores | batch mensual |
| Codigueras XML | Incisos y unidades ejecutoras | batch eventual |

## Stack

Monorepo: **NestJS 11 + Mongoose** (backend), **Angular 22 standalone +
zoneless + Tailwind v4** (frontend), **`packages/shared`** con el contrato de
dominio compartido (`Serializado<T>` deriva la forma HTTP de los tipos de
dominio). MongoDB 7 en Docker.

## Cómo correr

```bash
# Stack completo (mongo + api + web) — nace con base vacía
docker compose up --build          # web: http://localhost:8080

# Desarrollo
cd backend  && npm ci && npm run start:dev    # api: http://localhost:3000/api/v1
cd frontend && npm ci && ng serve             # web: http://localhost:4200

# Ingestas (batch, idempotentes)
cd backend
npm run ingesta:codigueras         # incisos/UEs (descarga sola)
npm run ingesta:proveedores        # CSV RUPE desde data/rupe/
npm run ingesta:ocds -- 2025       # dump OCDS desde data/ocds/ocds-2025.zip

# Tests
cd backend  && npx jest            # unitarios (parsers y matcher con fixtures reales)
cd backend  && npm run test:e2e    # API completa contra Mongo efímero
cd frontend && npx ng test         # vitest
```

Config: `.env` en la raíz con `MONGODB_URI` (ver `docker-compose.yml` para el
formato). El health check (`GET /api/v1/health`) verifica Mongo de verdad:
200 sano / 503 degradado.

## Decisiones de arquitectura

Documentadas en [`handoff.MD`](handoff.MD) — parsers como funciones puras
testeadas con fixtures reales de las fuentes, patrón Repository con swap por
`useClass`, el motor de alertas que recibe en vez de buscar, y por qué
`inciso: 0` es un valor honesto.
