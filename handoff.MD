# Boletín de Contrataciones del Estado Uruguayo — Handoff

> Documento de contexto para continuar el desarrollo en Claude Code.
> Actualizado: 2026-07-03, al cierre de la sesión que completó ingesta OCDS,
> perfil de empresa, filtros validados y exception filter.

---

## 1. Qué es este proyecto

Sistema para visualizar y consultar contrataciones públicas del Estado uruguayo.
El objetivo del autor es **aprender arquitectura profesional**, no solo entregar features.
Cada decisión técnica debe explicarse (el porqué antes que el cómo). El autor tiene
experiencia con React, Next.js, Angular, NestJS, MongoDB, Docker y TypeScript.

**Cómo trabajar con el autor** (reglas confirmadas en sesiones anteriores):
- Explicar el problema antes de escribir código; ofrecer alternativas con recomendación.
- Verificar contra la fuente real antes de modelar datos (nunca inventar campos).
- El autor levanta backend/frontend en SUS consolas y verifica con sus ojos:
  darle checklists de qué mirar, no ejecutar servidores por él.
- Tests unitarios y `tsc --noEmit` sí se corren automáticamente.
- No avanzar de bloque sin confirmación. Commits: Conventional Commits en español.

---

## 2. Fuentes de datos (verificadas contra las fuentes reales)

| Fuente | Qué trae | Rol |
|---|---|---|
| **RSS** `comprasestatales.gub.uy/consultas/rss` | Solo vigentes del año corriente, superficial (título/link/fechas) | Tiempo casi real (cron 15 min) |
| **Dumps OCDS anuales** (catálogo `arce-datos-historicos-de-compras`) | Histórico completo 2002–2025: items con precios, adjudicaciones, proveedores, contactos | Profundidad histórica (batch anual) |
| **CSV mensuales RUPE** (catálogo de datos abiertos) | Registro de proveedores | Identidad de empresas |
| **Codigueras XML** (dataset `acce-compras-estatales`) | Incisos, unidades ejecutoras, monedas, tipos | PENDIENTE de ingestar |

Detalles críticos de las fuentes:
- Los dumps OCDS se publican en **enero del año siguiente** (2025 salió 19/01/2026).
  Un ZIP por año → 12 archivos `l-MM` (llamados) + 12 `a-MM` (adjudicaciones).
  2025 = 144.560 releases. Se descargan A MANO a `backend/data/ocds/ocds-<año>.zip`.
- `catalogodatos.gub.uy` rechaza clientes no-browser (`-A "Mozilla/5.0"`) y su cadena
  TLS falla en curl (usar `-k` solo para reconocimiento).
- CSV de RUPE: separador `;`, encoding latin1, "Sin dato" = vacío.

**Claves de correlación entre fuentes** (la razón de varias decisiones):
```
OCDS tender.id      == id del portal == id extraído del RSS   (ej: "i455644")
OCDS parties[].id   == "66-1" → inciso 66, unidad ejecutora 1
OCDS supplier.id    == "R/214365280014" → RUT == numeroDocumento en RUPE
```
Los IDs con prefijo `i` son llamados IMPORTADOS de sistemas propios (IM, OSE, ANP,
ANCAP...). El prefijo SE CONSERVA: es un identificador externo opaco, y `i495595`
y `495595` podrían ser llamados distintos.

---

## 3. Stack y convenciones

### Backend: NestJS 11 + Mongoose + MongoDB 7 (Docker local)
- `@nestjs/config` (`.env` en la RAÍZ del repo, `envFilePath: '../.env'`)
- `@nestjs/schedule` (cron RSS), `fast-xml-parser` (RSS), `adm-zip` (OCDS),
  `csv-parse` (RUPE), `class-validator`/`class-transformer` (DTOs)
- Por `isolatedModules`: tipos con `import type`, valores runtime con `import` normal.

### Frontend: Angular 22 standalone + zoneless + Tailwind v4
| Concepto | Convención actual (NO la de tutoriales viejos) |
|---|---|
| Archivos | `app.ts`, `app.html` (NO `app.component.ts`) |
| Servicios | archivo `api.ts`, clase `Api`, decorador `@Service()` |
| Inyección | `inject()` — NO constructor injection |
| Reactividad | `signal()` + `.set()` obligatorio; zoneless |
| Templates | `@if` / `@for` (NO `*ngIf`) |
| Rutas | `withComponentInputBinding()`: params como `input()` del componente |

### Infra
- Monorepo manual `/backend` + `/frontend`. Git en la raíz `RUPE/`.
- OJO: hay un contenedor Mongo llamado `mongodb` (no el del docker-compose, que
  crearía uno llamado `rupe`) ya corriendo en 27017 con los datos. No tocar Docker
  si ese contenedor está arriba.
- `.gitignore` cubre `backend/data/` entero (CSVs y ZIPs no se commitean).

---

## 4. Arquitectura actual

```
backend/src/
├── main.ts                  # CORS + api/v1 + ValidationPipe global + ExceptionFilter global
├── app.module.ts            # ConfigModule global + Database + Proveedores + Licitaciones
├── database/                # MongooseModule.forRootAsync desde .env
├── shared/
│   ├── types/               # CONTRATO de dominio (el frontend lo duplica a mano — deuda aceptada)
│   └── filters/             # GlobalExceptionFilter: shape único {statusCode, error, mensajes[], ruta, timestamp}
├── licitaciones/
│   ├── schemas/licitacion.schema.ts   # índices: id único, estado+fechaRecepcion, text, adjudicacion.proveedor.numeroDocumento (sparse)
│   ├── parsers/                       # FUNCIONES PURAS testeadas con fixtures reales
│   │   ├── rss-llamado.parser.ts      #   RSS → dominio (REGEX_NUMERO_COMPRA compartido)
│   │   └── ocds-release.parser.ts     #   OCDS tender/award → dominio
│   ├── rss-ingest.service.ts          # descarga + orquesta + upsert por id
│   ├── rss-scheduler.service.ts       # cron 15min + ingesta al arrancar (OnModuleInit)
│   ├── ocds-ingest.service.ts         # ZIP → bulkWrite lotes de 1000, l-* antes que a-*
│   ├── dto/buscar-licitaciones.dto.ts # page/limit/texto/estado/tipo/anio/inciso/orden validados
│   ├── licitaciones.service.ts        # buscar (filtros+orden), buscarPorId, resumenAdjudicacionesPorProveedor ($facet)
│   └── licitaciones.controller.ts     # GET /licitaciones, /:id (404 si no existe), /debug/ingestar-ahora
├── proveedores/
│   ├── proveedores.service.ts         # buscar paginado + getPerfil (cruza CSV + Mongo en paralelo)
│   └── proveedores.controller.ts      # GET /proveedores?page&limit&texto, /:documento, /:documento/perfil
├── ingesta/                           # Ports & Adapters de proveedores
│   ├── repositories/proveedores-repository.interface.ts  # buscar() y findByDocumento() — paginación EN el contrato
│   ├── repositories/proveedores-csv.repository.ts        # cache en memoria, filtro+slice
│   └── parsers/rupe-csv.parser.ts
└── scripts/ingesta-ocds.ts            # npm run ingesta:ocds [-- 2024] — createApplicationContext
                                       # con módulo propio (NO importa LicitacionesModule para no
                                       # disparar el scheduler del RSS)

frontend/src/app/
├── app.config.ts            # zoneless + withComponentInputBinding
├── app.ts/.html             # navbar Licitaciones|Proveedores + health check
├── core/api.ts              # wrapper HttpClient
└── features/
    ├── licitaciones/
    │   ├── licitaciones-api.ts        # tipos duplicados + buscar(filtros) + getPorId
    │   ├── licitaciones-list/         # barra de filtros (texto debounce + selects) + paginación + badges
    │   └── licitacion-detail/         # adjudicación, items con precios, contacto; id por input()
    └── proveedores/
        ├── proveedores-api.ts         # buscar paginado + getPerfil
        ├── proveedores-list/          # búsqueda RxJS (debounceTime+distinctUntilChanged+switchMap)
        └── perfil-empresa/            # historial de adjudicaciones navegable
```

### Decisiones de arquitectura (respetar)
1. **IDs externos son opacos**: se guardan tal cual (`i495595` con su `i`). El upsert
   por `id` es lo que fusiona RSS y OCDS en el mismo documento.
2. **Parsers = funciones puras** en `parsers/`, testeadas con fixtures REALES de las
   fuentes (nunca ejemplos inventados). Regex validados contra el universo completo
   (feed entero / dump entero) antes de escribirse.
3. **Patrón Repository para proveedores**: paginación y búsqueda son parte del
   contrato (interfaz), no del adaptador. Migrar a Mongo = swap de `useClass`.
4. **Montos por moneda, nunca sumados entre monedas** (UYU+USD en un número = mentira).
5. **Resiliencia de ingesta**: un item malo se loguea y se sigue. El `throw` de un
   parser es telemetría (alarma de calidad de datos), no una falla del sistema.
6. **bulkWrite para batch** (144k docs en ~70s), findOneAndUpdate para el RSS (~900).
7. **Regex moderadamente estrictos**: `\w+` para IDs (tolera variantes nuevas) pero
   sigue tirando error si falta el segmento — un regex demasiado estricto que
   "matchea algo parecido" corrompe datos EN SILENCIO (pasó con `\d{3,7}`).

---

## 5. Estado: qué funciona hoy

- ✅ Ingesta RSS cada 15 min, **0 errores** (antes fallaban 157 por el regex de ID)
- ✅ Ingesta OCDS 2025 completa: 35.502 llamados + 109.058 adjudicaciones, 0 errores, 71s
- ✅ Mongo con ~35k licitaciones: 2025 completo (con adjudicaciones, montos,
  items con precio unitario, contactos, inciso real) + vigentes 2026 del RSS
- ✅ API: filtros validados (DTO+ValidationPipe), orden configurable, full-text,
  404 correctos, errores con shape único
- ✅ Perfil de empresa: `GET /proveedores/:documento/perfil` — aggregation `$facet`
  (montos por moneda, top organismos, últimas 10 adjudicaciones)
- ✅ Frontend: circuito completo navegable — lista licitaciones (filtros) → detalle
  (adjudicación/items/contacto) → perfil del proveedor ganador → otra licitación.
  Proveedores paginados con búsqueda debounced.
- ✅ 31 tests unitarios verdes (parsers con fixtures reales)
- ✅ Git al día: historia en Conventional Commits (ver `git log --oneline`)

### Comandos
```bash
# Backend dev          cd backend && npm run start:dev
# Frontend dev         cd frontend && ng serve
# Tests                cd backend && npx jest
# Ingesta OCDS         cd backend && npm run ingesta:ocds        # (usa data/ocds/ocds-2025.zip)
#                      npm run ingesta:ocds -- 2024              # otro año (bajar ZIP antes)
# Ingesta RSS manual   GET http://localhost:3000/api/v1/licitaciones/debug/ingestar-ahora
# Drop licitaciones    docker exec -it mongodb mongosh -u admin -p admin --authenticationDatabase admin RUPE --eval "db.licitaciones.drop()"
```

---

## 6. PENDIENTES (en orden de valor sugerido)

### Bugs conocidos (chicos, no bloquean)
- **BUG-4** — `limpiarDescripcion` del parser RSS separa por `\n` pero el feed usa
  `<br/>`: las descripciones del RSS quedan con `<br/>` y fechas incrustadas.
  (Las de OCDS están limpias.)
- Los docs ingestados SOLO por RSS tienen `organismo.inciso: 0` (el RSS no trae
  el código; OCDS sí). Se resuelve con las codigueras XML o esperando el dump anual.
- `proveedores-list.spec.ts` (frontend) quedó genérico y probablemente no corre
  (falta provideHttpClient en el TestBed). Los specs de frontend nunca se corrieron.

### Bloque 3 — resto
- [ ] Serialización: ocultar `fechaIngesta`, `__v`, `_id` de las respuestas
      (class-transformer o proyección en los .lean())

### Bloque 2 — cierre
- [ ] `ProveedoresMongoRepository` + schema + comando de ingesta CSV→Mongo.
      El swap debe ser SOLO cambiar `useClass` en `ingesta.module.ts`.
- [ ] Ingesta de codigueras XML (incisos/unidades ejecutoras) → resolver inciso 0

### Bloque 5 — Alertas (el gran siguiente; los tipos ya existen en shared/types)
- [ ] CRUD de alertas (criterios = mismos filtros del DTO de búsqueda)
- [ ] Motor de matcheo en la ingesta RSS: llamado nuevo vs alertas activas
- [ ] Canal: empezar por log/email

### Bloque 6 — Calidad e infra
- [ ] Ingestar más años OCDS (2024, 2023... — bajar ZIPs y correr script)
- [ ] Extraer `shared/types` a paquete compartido (hoy el frontend duplica a mano)
- [ ] e2e de endpoints, CI, dockerizar backend+frontend, Atlas para prod
- [ ] Observabilidad: health check que verifique Mongo

### Ideas anotadas
- Guardar el dato CRUDO (item RSS / release OCDS) junto al parseado para poder
  re-procesar la historia cuando un parser mejora.
- Scraping de la página de detalle (server-rendered, verificado viable) para
  enriquecer vigentes: pliegos adjuntos, prórrogas, aclaraciones.
- `Manual_de_Interfaz_G2B.pdf` documenta una interfaz de consulta del portal
  (en el dataset `acce-compras-estatales`).
