# Boletín de Contrataciones del Estado Uruguayo — Handoff

> Documento de contexto para continuar el desarrollo en Claude Code.
> Escrito al cierre de la sesión de arquitectura inicial. Refleja el estado real del repo.

---

## 1. Qué es este proyecto

Sistema para visualizar y consultar contrataciones públicas del Estado uruguayo,
ingiriendo datos de **ARCE / ACCE** (Agencia Reguladora de Compras Estatales) desde dos fuentes:

- **RSS** del portal `comprasestatales.gub.uy` → licitaciones/llamados en tiempo casi real
- **CSV mensuales de RUPE** (Registro Único de Proveedores del Estado) del catálogo de datos abiertos `catalogodatos.gub.uy`

El objetivo del autor es **aprender arquitectura profesional**, no solo entregar features.
Cada decisión técnica debe explicarse. Preferir explicaciones de arquitectura, patrones y
buenas prácticas sobre lo básico. El autor tiene experiencia con React, Next.js, Angular,
NestJS, MongoDB, Docker y TypeScript.

---

## 2. Stack técnico

### Backend
- NestJS (última versión) + TypeScript
- MongoDB vía Mongoose (`@nestjs/mongoose`)
- `@nestjs/config` para variables de entorno
- `@nestjs/schedule` para ingesta programada (cron)
- `axios` para consumir servicios externos
- `fast-xml-parser` para el RSS
- `csv-parse` para los CSV de RUPE

### Frontend
- Angular 22 **standalone + zoneless** (usa Signals, `@if`/`@for`, `inject()`)
- Tailwind CSS v4 (nativo vía `--style=tailwind`, sin `tailwind.config.js`)
- RxJS

### Infra
- Monorepo manual (`/backend`, `/frontend`)
- MongoDB local vía Docker Compose (con autenticación root)
- Atlas reservado para producción (aún no configurado)

---

## 3. Convenciones importantes del entorno (NO son las de tutoriales viejos)

Angular 20+ cambió convenciones. Respetar esto al generar código:

| Concepto | Convención actual |
|---|---|
| Naming de archivos | `app.ts`, `app.html` (NO `app.component.ts`) |
| Clase de componente raíz | `App` (NO `AppComponent`) |
| Servicios | archivo `api.ts`, clase `Api`, decorador `@Service()` |
| Inyección | `inject()` (NO constructor injection) — `@Service` solo soporta `inject()` |
| Change detection | **zoneless**: usar `provideZonelessChangeDetection()`, NO Zone.js |
| Reactividad UI | **obligatorio** usar `signal()` + `.set()`. Asignar a props normales NO refresca la UI |
| Control flow | `@if` / `@for` en templates (NO `*ngIf` / `*ngFor`, no requiere `CommonModule`) |

En el backend, por `isolatedModules` + `emitDecoratorMetadata`:
- Tipos/interfaces usados en firmas decoradas van con `import type`
- Valores en runtime (tokens `Symbol`, clases) van con `import` normal

---

## 4. Estructura actual del repo

```
RUPE/
├── .env                      # credenciales reales (NO commiteado)
├── .env.example
├── .gitignore                # ignora node_modules, dist, .env, backend/data/**/*.csv
├── docker-compose.yml        # MongoDB 7 con auth root vía variables de .env
├── README.md
│
├── backend/
│   ├── data/
│   │   └── rupe/
│   │       └── 2026-05.csv   # CSV de RUPE (separador ';', encoding latin1)
│   └── src/
│       ├── main.ts           # CORS, prefijo global api/v1, puerto
│       ├── app.module.ts     # ConfigModule global + MongooseModule + módulos de negocio
│       ├── app.controller.ts # GET /health
│       ├── app.service.ts
│       │
│       ├── shared/types/     # CONTRATO compartido backend/frontend (Bloque 1)
│       │   ├── enums.ts              # TipoContratacion, EstadoResolucion, EstadoLlamado,
│       │   │                         # Moneda, FamiliaArticulo, TipoDocumento,
│       │   │                         # EstadoProveedor (ACTIVO/EN INGRESO/BAJA DGI/DESCONOCIDO)
│       │   ├── organismos.ts         # 99 incisos reales del SICE + TipoOrganismo
│       │   ├── licitacion.types.ts   # Licitacion, Adjudicacion, ItemLlamado, Organismo...
│       │   ├── proveedor.types.ts    # ProveedorRupe, PerfilEmpresa
│       │   ├── alerta.types.ts       # Alerta, CriteriosAlerta, TipoAlerta
│       │   └── index.ts              # barrel
│       │
│       ├── ingesta/          # Ports & Adapters — capa de acceso a datos
│       │   ├── ingesta.module.ts
│       │   ├── repositories/
│       │   │   ├── proveedores-repository.interface.ts  # PROVEEDORES_REPOSITORY (Symbol) + interfaz
│       │   │   └── proveedores-csv.repository.ts         # adaptador CSV (cache en memoria, latin1, ';')
│       │   ├── parsers/
│       │   │   └── rupe-csv.parser.ts                    # parsearFilaRupe() — función pura
│       │   └── services/
│       │       ├── rss-ingest.service.ts                # consume RSS, upsert a Mongo
│       │       └── rss-scheduler.service.ts             # cron @nestjs/schedule + ingesta al arrancar
│       │
│       ├── proveedores/      # módulo de negocio RUPE
│       │   ├── proveedores.module.ts
│       │   ├── proveedores.controller.ts   # GET /proveedores, GET /proveedores/:documento
│       │   └── proveedores.service.ts      # inyecta PROVEEDORES_REPOSITORY por token
│       │
│       └── licitaciones/     # módulo de negocio de llamados
│           ├── licitaciones.module.ts
│           ├── licitaciones.controller.ts  # GET /licitaciones, /:id, /debug/ingestar-ahora
│           ├── licitaciones.service.ts
│           └── schemas/                     # (probable) schema Mongoose de Licitacion
│
└── frontend/
    └── src/
        ├── main.ts
        ├── styles.css                       # @import "tailwindcss";
        ├── environments/
        │   ├── environment.ts               # apiUrl: http://localhost:3000/api/v1
        │   └── environment.prod.ts
        └── app/
            ├── app.ts / app.html / app.config.ts / app.routes.ts
            ├── core/
            │   └── api.ts                    # clase Api, wrapper HttpClient genérico get<T>/post<T>
            └── features/
                └── proveedores/
                    ├── proveedores-api.ts
                    └── proveedores-list/     # tabla con @for, signals, Tailwind
```

---

## 5. Decisiones de arquitectura ya tomadas (respetar y mantener)

1. **Patrón Repository / Ports & Adapters.** El acceso a datos está detrás de una interfaz
   (`ProveedoresRepository`) inyectada por token `Symbol`. Hoy la implementación es CSV; migrar
   a Mongo debe ser **solo** cambiar `useClass` en `ingesta.module.ts`, sin tocar controllers/services.
   → **Pendiente**: crear `ProveedoresMongoRepository` como segundo adaptador y hacer el swap.

2. **`shared/types` como contrato único.** Las interfaces viven en el backend. El frontend hoy
   las **duplica** manualmente (deuda técnica aceptada). Mejora futura: npm workspaces o paquete
   `@rupe/shared` para eliminar la duplicación.

3. **Datos reales, no supuestos.** Los enums se corrigieron contra los archivos reales
   (ej. `EstadoProveedor` = ACTIVO / EN INGRESO / BAJA DGI, con fallback DESCONOCIDO). Mantener
   esta disciplina: verificar contra la fuente antes de modelar.

4. **Resiliencia en ingesta.** Un item que falla NO debe abortar toda la ingesta. Se loguea como
   warning y se sigue (patrón ya aplicado en `RssIngestService`: "X ok, Y con error").

5. **Cache en memoria en el repo CSV.** Los CSV se leen una vez al arrancar. Al migrar a Mongo
   este cache desaparece (queries directas).

---

## 6. Estado actual — qué funciona

- ✅ Bloque 0: monorepo, NestJS con `/health` + CORS + `api/v1`, Angular zoneless + Tailwind
- ✅ Bloque 1: modelos de dominio (`shared/types`) con datos reales
- ✅ Bloque 2 (parcial): repo CSV de proveedores funcionando, endpoint `/proveedores` sirviendo
  datos reales, frontend mostrando la tabla
- ✅ MongoDB local vía Docker con auth root resuelta
- ✅ Ingesta RSS conectada a Mongo: **799 items OK** en la última corrida

---

## 7. BUGS ABIERTOS (arrancar por acá)

### BUG-1 — 157 items de RSS fallan al extraer el ID  🔴 prioridad alta
Síntoma:
```
No se pudo extraer el id del link: http://www.comprasestatales.gub.uy/consultas/detalle/id/i495595
```
Causa probable: el regex de extracción de ID en `RssIngestService` solo contempla IDs numéricos
puros, pero el portal usa una variante con prefijo de letra (`id/i495595`, y quizá otras como
`mostrar-llamado/1/id/...`). Hay al menos dos formatos de URL de detalle conviviendo.
Acción: revisar todos los formatos de `link` en el feed real, generalizar el regex, agregar tests
unitarios con las variantes encontradas. Verificar que suba de 799 → 956 OK.

### BUG-2 — Warning de Mongoose `new` deprecado  🟡 prioridad baja
Síntoma:
```
[MONGOOSE] Warning: the `new` option for findOneAndUpdate()/findOneAndReplace() is deprecated.
Use `returnDocument: 'after'` instead.
```
Causa: uso de `{ new: true }` en algún `findOneAndUpdate` (probablemente el upsert del RSS).
Acción: reemplazar por `{ returnDocument: 'after', upsert: true }`. No rompe nada, pero limpia el log.

---

## 8. ROADMAP pendiente

### Bloque 2 — completar ingesta (en curso)
- [ ] BUG-1 y BUG-2
- [ ] `ProveedoresMongoRepository` + schema Mongoose de proveedor → migrar CSV a Mongo
- [ ] Comando/servicio de ingesta de CSV a Mongo (hoy el CSV vive solo en memoria)
- [ ] Índices Mongo: por `numeroDocumento` (proveedores), por `id` y `numeroCompra` (licitaciones),
      índice de texto para búsqueda por descripción
- [ ] Validar encoding real del CSV (confirmar si latin1 vs utf-8 según acentos)

### Bloque 3 — API de consulta robusta
- [ ] DTOs de query con `class-validator` + `ValidationPipe` global
- [ ] Paginación (limit/offset o cursor) — hoy `/proveedores` devuelve TODO, no escala
- [ ] Filtros: por inciso, tipo de contratación, estado, rango de fechas, texto libre
- [ ] Ordenamiento
- [ ] Serialización con `class-transformer` (no exponer `fechaIngesta`, `urlOrigen`, etc. crudos)
- [ ] Manejo de errores centralizado (exception filter) + shape de error consistente

### Bloque 4 — Frontend real
- [ ] Layout/shell: navbar + routing entre Licitaciones y Proveedores
- [ ] Listado de licitaciones con filtros conectados a la API
- [ ] Vista de detalle de licitación (items, contacto, aclaraciones, adjudicación)
- [ ] Perfil de empresa (`PerfilEmpresa`): historial de adjudicaciones, montos, organismos frecuentes
- [ ] Estados de carga/error/vacío consistentes (considerar un patrón de "resource state")
- [ ] Búsqueda con debounce (RxJS `debounceTime` + `switchMap`)
- [ ] Paginación en UI

### Bloque 5 — Alertas (modelo ya definido)
- [ ] CRUD de alertas (`Alerta`, `CriteriosAlerta`)
- [ ] Motor de matcheo: al ingestar un llamado nuevo, evaluar contra alertas activas
- [ ] Canal de notificación (empezar por log/email; definir después)

### Bloque 6 — Calidad e infra
- [ ] Tests: unitarios de parsers (funciones puras, fáciles), e2e de endpoints
- [ ] Extraer `shared/types` a paquete compartido (eliminar duplicación FE/BE)
- [ ] Dockerizar backend y frontend; `docker-compose` completo (Mongo + API + web)
- [ ] Configuración Atlas para producción (`MONGODB_URI_ATLAS` ya reservada en `.env`)
- [ ] CI (lint + test + build) — Conventional Commits ya en uso, habilita changelog automático
- [ ] Observabilidad: logs estructurados, health check que verifique la conexión a Mongo

---

## 9. Comandos de referencia

```bash
# Levantar Mongo local
docker-compose up -d
docker-compose down -v          # -v resetea el volumen (borra datos)

# Entrar a mongosh autenticado
docker exec -it rupe-mongodb mongosh -u admin -p <PASS> --authenticationDatabase admin

# Backend
cd backend && npm run start:dev

# Frontend
cd frontend && ng serve

# Endpoints clave
GET http://localhost:3000/api/v1/health
GET http://localhost:3000/api/v1/proveedores
GET http://localhost:3000/api/v1/licitaciones
GET http://localhost:3000/api/v1/licitaciones/debug/ingestar-ahora
```

## 10. Fuentes de datos reales

- RSS de llamados: `comprasestatales.gub.uy/consultas/rss/...` (parámetros de tipo-pub, tipo-fecha,
  orden, rango-fecha). Devuelve `application/rss+xml`.
- CSV de RUPE: catálogo `catalogodatos.gub.uy`, dataset "ARCE - Registro Único de Proveedores del
  Estado (RUPE)". Un CSV por mes, separador `;`, campos vacíos como el literal `"Sin dato"`,
  columnas: `pais_prov; identificacion_prov; denominacion_social_prov; domicilio_fiscal;
  localidad_prov; departamento_prov; estado_prov`. No hay columna de tipo de documento
  (se infiere por longitud: 12 dígitos = RUT, 7-8 = cédula).
- Detalle de llamado (para scraping/enriquecimiento futuro):
  `comprasestatales.gub.uy/consultas/detalle/...`

---

## 11. Cómo trabajar en este proyecto (para el asistente)

- No avanzar de bloque sin confirmación del autor.
- Explicar el problema antes de escribir código, y el porqué de cada decisión.
- Ofrecer alternativas y buenas prácticas cuando existan.
- Verificar contra la fuente real antes de modelar datos (no inventar campos/valores).
- Respetar las convenciones Angular 22 y las reglas de `import type` del backend.
- Mantener el patrón Repository intacto: la lógica de negocio no debe saber de dónde vienen los datos.