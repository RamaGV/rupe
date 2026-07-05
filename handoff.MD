# Boletín de Contrataciones del Estado Uruguayo — Handoff

> Documento de contexto para continuar el desarrollo en Claude Code.
> Actualizado: 2026-07-04, al cierre de la sesión que completó las alertas
> de VENCIMIENTO (cron de reloj) y arregló tres bugs destapados usando el
> producto: timestamps en las respuestas, el "vigente eterno" de OCDS y
> awards sin buyer que pisaban el organismo. Bloque 5: solo falta email.

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
| **CSV mensuales RUPE** (catálogo de datos abiertos) | Registro de proveedores | Identidad de empresas (ya en Mongo) |
| **Codigueras XML** (dataset `acce-compras-estatales`) | 73 incisos + 527 unidades ejecutoras | INGESTADA — resuelve el inciso de los llamados del RSS |

Detalles críticos de las fuentes:
- Los dumps OCDS se publican en **enero del año siguiente** (2025 salió 19/01/2026).
  Un ZIP por año → 12 archivos `l-MM` (llamados) + 12 `a-MM` (adjudicaciones).
  2025 = 144.560 releases. Se descargan A MANO a `backend/data/ocds/ocds-<año>.zip`.
- `catalogodatos.gub.uy` rechaza clientes no-browser (`-A "Mozilla/5.0"`) y su cadena
  TLS falla en curl — pero solo publica el CATÁLOGO: las codigueras XML se sirven
  desde `comprasestatales.gub.uy` (mismo host del RSS, sin problemas TLS).
- CSV de RUPE: separador `;`, encoding latin1, "Sin dato" = vacío.
- Codigueras XML: también **ISO-8859-1**. El marcador de UE inactiva "NO VIGENTE"
  aparece en 6 variantes (prefijo, sufijo, incrustado): se detecta con contains
  y el nombre se guarda tal cual.
- La `<description>` del RSS es **CDATA con HTML adentro**: `<br/>` como separador
  y entidades HTML (`&sol;` `&nbsp;` `&Uacute;` `&oacute;`) que fast-xml-parser
  correctamente NO decodifica. `normalizarDescripcion()` (parser RSS) las resuelve.

**Claves de correlación entre fuentes** (la razón de varias decisiones):
```
OCDS tender.id      == id del portal == id extraído del RSS   (ej: "i455644")
OCDS parties[].id   == "66-1" → inciso 66, unidad ejecutora 1 == codiguera
OCDS supplier.id    == "R/214365280014" → RUT == numeroDocumento en RUPE/proveedores
RSS nombreInciso    == nombre de la codiguera (normalizado: sin tildes/case/espacios)
```
Los IDs con prefijo `i` son llamados IMPORTADOS de sistemas propios (IM, OSE, ANP,
ANCAP...). El prefijo SE CONSERVA: es un identificador externo opaco, y `i495595`
y `495595` podrían ser llamados distintos.

---

## 3. Stack y convenciones

### Backend: NestJS 11 + Mongoose + MongoDB 7 (Docker local)
- `@nestjs/config` (`.env` en la RAÍZ del repo, `envFilePath: '../.env'`)
- `@nestjs/schedule` (cron RSS), `fast-xml-parser` (RSS y codigueras), `adm-zip` (OCDS),
  `csv-parse` (RUPE), `class-validator`/`class-transformer` (DTOs)
- Por `isolatedModules`: tipos con `import type`, valores runtime con `import` normal.
  (Ojo: `FilterQuery` no se exporta de mongoose en esta versión — usar
  `Record<string, any>` para filtros incrementales, como en licitaciones.service.)

### Frontend: Angular 22 standalone + zoneless + Tailwind v4
| Concepto | Convención actual (NO la de tutoriales viejos) |
|---|---|
| Archivos | `app.ts`, `app.html` (NO `app.component.ts`) |
| Servicios | archivo `api.ts`, clase `Api`, decorador `@Service()` |
| Inyección | `inject()` — NO constructor injection |
| Reactividad | `signal()` + `.set()` obligatorio; zoneless |
| Templates | `@if` / `@for` (NO `*ngIf`) |
| Rutas | `withComponentInputBinding()`: params como `input()` del componente |
| Tests | vitest vía `ng test`; TestBed replica app.config.ts (zoneless + provideHttpClientTesting + provideRouter) |

### Infra
- Monorepo manual `/backend` + `/frontend`. Git en la raíz `RUPE/`.
- OJO: hay un contenedor Mongo llamado `mongodb` (no el del docker-compose, que
  crearía uno llamado `rupe`) ya corriendo en 27017 con los datos. No tocar Docker
  si ese contenedor está arriba.
- `.gitignore` cubre `backend/data/` entero (CSVs y ZIPs no se commitean).
- Colecciones en Mongo: `licitaciones`, `proveedores`, `organismos` (codiguera).

---

## 4. Arquitectura actual

```
backend/src/
├── main.ts                  # CORS + api/v1 + ValidationPipe global + ExceptionFilter global
├── app.module.ts            # ConfigModule global + Database + Proveedores + Licitaciones
├── database/                # MongooseModule.forRootAsync desde .env
├── shared/
│   ├── types/               # CONTRATO de dominio (el frontend lo duplica a mano — deuda aceptada)
│   │                        #   ProveedorPublico = Omit<ProveedorRupe,'fechaIngesta'> (vista de API)
│   └── filters/             # GlobalExceptionFilter: shape único {statusCode, error, mensajes[], ruta, timestamp}
├── alertas/                 # Bloque 5: el boletín propiamente dicho (single-user, sin auth)
│   ├── schemas/alerta.schema.ts       # criterios = SOLO lo matcheable hoy (sin monto/familias: el RSS no los trae)
│   ├── schemas/notificacion.schema.ts # snapshots (hechos, no referencias); índice único alertaId+licitacionId
│   ├── matcher/alerta-matcher.ts      # FUNCIÓN PURA: OR dentro de un criterio, AND entre criterios,
│   │                                  #   palabras clave por PREFIJO de palabra ("obra"→"obras", no "cobranza")
│   ├── alertas-matcher.service.ts     # el motor: recibe los llamados NUEVOS de la ingesta (no importa licitaciones)
│   ├── alertas.service.ts/.controller # CRUD /alertas (400 si no hay ningún criterio)
│   └── notificaciones.service/.controller  # GET /notificaciones (+sinLeer), PATCH /:id/leida
├── codigueras/              # codiguera oficial de organismos (73 incisos, 527 UEs)
│   ├── schemas/organismo-codiguera.schema.ts  # 1 doc por inciso, UEs embebidas, nombreNormalizado indexado
│   ├── parsers/codigueras-xml.parser.ts       # puro; normalizarNombreOrganismo = la clave del cruce
│   ├── codigueras.service.ts                  # Map nombre→inciso en memoria (OnModuleInit); resolverInciso()
│   └── codigueras-ingest.service.ts           # solo se ensambla en el script batch (patrón OCDS)
├── licitaciones/
│   ├── schemas/licitacion.schema.ts   # índices: id único, estado+fechaRecepcion, text, adjudicacion.proveedor.numeroDocumento (sparse)
│   ├── parsers/                       # FUNCIONES PURAS testeadas con fixtures reales
│   │   ├── rss-llamado.parser.ts      #   RSS → dominio (normalizarDescripcion + REGEX_NUMERO_COMPRA)
│   │   └── ocds-release.parser.ts     #   OCDS tender/award → dominio
│   ├── rss-ingest.service.ts          # descarga + orquesta + enriquecerInciso + upsert por id
│   │                                  #   (includeResultMetadata detecta INSERCIÓN → dispara el motor de alertas;
│   │                                  #    los errores del motor NO tiran la ingesta)
│   ├── rss-scheduler.service.ts       # cron 15min + ingesta al arrancar (OnModuleInit)
│   ├── vencimientos-scheduler.service.ts  # cron diario 8:00 + al arrancar: vigentes que
│   │                                  #   cierran en <48h → alertasMatcher.procesarVencimientos()
│   │                                  #   (vive ACÁ y no en alertas/: este módulo sabe consultar)
│   ├── ocds-ingest.service.ts         # ZIP → bulkWrite lotes de 1000, l-* antes que a-*
│   ├── dto/buscar-licitaciones.dto.ts # page/limit/texto/estado/tipo/anio/inciso/orden validados
│   ├── licitaciones.service.ts        # buscar/buscarPorId con PROYECCION_PUBLICA (_id,__v,fechaIngesta fuera)
│   └── licitaciones.controller.ts     # GET /licitaciones, /:id (404 si no existe), /debug/ingestar-ahora
├── proveedores/
│   ├── proveedores.service.ts         # frontera de API: aPublico() traduce dominio → ProveedorPublico
│   └── proveedores.controller.ts      # GET /proveedores?page&limit&texto, /:documento, /:documento/perfil
├── ingesta/                           # Ports & Adapters de proveedores
│   ├── repositories/proveedores-repository.interface.ts  # contrato en idioma del DOMINIO
│   ├── repositories/proveedores-mongo.repository.ts      # ACTIVO (useClass) — regex "contiene" escapado, sort estable
│   ├── repositories/proveedores-csv.repository.ts        # vuelta atrás; prueba de que el contrato no sabe de infra
│   ├── schemas/proveedor.schema.ts                       # numeroDocumento único, razonSocial indexado
│   └── parsers/rupe-csv.parser.ts
└── scripts/                           # batch standalone (createApplicationContext, módulo propio,
    ├── ingesta-ocds.ts                #   NUNCA importan LicitacionesModule → no disparan el scheduler)
    ├── ingesta-codigueras.ts          # descarga XMLs + upsert + backfill de licitaciones con inciso 0
    └── ingesta-proveedores.ts         # CSV RUPE → Mongo, reusa parsearFilaRupe, idempotente

frontend/src/app/
├── app.config.ts            # zoneless + withComponentInputBinding
├── app.ts/.html             # navbar + health check + campanita 🔔 (contador sinLeer,
│                            #   auto-refresh 60s: timer+switchMap+catchError adentro)
├── core/api.ts              # wrapper HttpClient
└── features/
    ├── alertas/
    │   ├── alertas-api.ts             # CRUD + notificaciones (Api ganó patch/delete)
    │   ├── alertas-page/              # crear (palabras/incisos por coma, tipo) + pausar/borrar
    │   └── notificaciones-page/       # bandeja: link al detalle, marcar leída, solo-no-leídas
    ├── licitaciones/
    │   ├── licitaciones-api.ts        # tipos duplicados + buscar(filtros) + getPorId
    │   ├── licitaciones-list/         # barra de filtros (texto debounce + selects) + paginación + badges
    │   └── licitacion-detail/         # adjudicación, items con precios, contacto; id por input()
    └── proveedores/
        ├── proveedores-api.ts         # buscar paginado + getPerfil
        ├── proveedores-list/          # búsqueda RxJS (debounce+distinct+switchMap) — con spec real
        └── perfil-empresa/            # historial de adjudicaciones navegable
```

### Decisiones de arquitectura (respetar)
1. **IDs externos son opacos**: se guardan tal cual (`i495595` con su `i`). El upsert
   por `id` es lo que fusiona RSS y OCDS en el mismo documento.
2. **Parsers = funciones puras** en `parsers/`, testeadas con fixtures REALES de las
   fuentes (nunca ejemplos inventados). Regex validados contra el universo completo
   (feed entero / dump entero) antes de escribirse. El enriquecimiento que necesita
   estado (ej. inciso desde la codiguera) vive en el ORQUESTADOR, no en el parser.
3. **Patrón Repository para proveedores**: paginación y búsqueda son parte del
   contrato (interfaz), no del adaptador. El swap CSV→Mongo fue UNA línea (hecho).
   Al cambiar de adaptador se preserva la SEMÁNTICA (regex "contiene", no text index).
4. **Montos por moneda, nunca sumados entre monedas** (UYU+USD en un número = mentira).
5. **Resiliencia de ingesta**: un item malo se loguea y se sigue. El `throw` de un
   parser es telemetría (alarma de calidad de datos), no una falla del sistema.
6. **bulkWrite para batch** (144k docs en ~70s), findOneAndUpdate para el RSS (~900).
7. **Regex moderadamente estrictos**: `\w+` para IDs (tolera variantes nuevas) pero
   sigue tirando error si falta el segmento — un regex demasiado estricto que
   "matchea algo parecido" corrompe datos EN SILENCIO (pasó con `\d{3,7}`, y casi
   pasa con las 6 variantes de "NO VIGENTE" en la codiguera).
8. **Serialización por proyección, no class-transformer**: `.lean()` devuelve objetos
   planos (sin hidratar) y la proyección hace que Mongo ni envíe los campos internos.
   La vista pública se define en tipos (`ProveedorPublico`) y en la frontera (service).
9. **inciso 0 es un valor honesto**: las UCC/UACM (compras centralizadas) no son un
   inciso. 920/929 llamados del RSS resuelven por nombre; los 9 restantes quedan en 0.
10. **El motor de alertas recibe, no busca**: la ingesta le PASA los llamados nuevos
    (alertas no importa licitaciones — dependencia en una sola dirección, sin ciclos).
    La decisión de matcheo es una función pura testeada; el service solo orquesta.
11. **Una alerta solo promete lo que puede cumplir**: el schema persiste únicamente
    los criterios matcheables con los datos reales (sin monto/familias hasta que
    alguna fuente los traiga). Una alerta sin criterios se rechaza con 400.
12. **Las notificaciones son hechos**: snapshots de la alerta y el llamado al momento
    del match — borrar la alerta no reescribe la historia de qué se notificó.
13. **La base guarda lo que la fuente dijo; la API responde lo que se pregunta**:
    un tender OCDS queda 'active' en su último release aunque haya cerrado hace
    meses (~6k docs). `estado=vigente` en la API se DERIVA: vigente Y (cierre
    futuro O desconocido) = "se puede ofertar hoy". El dato crudo no se pisa.
14. **En un patch parcial, "no sé" nunca pisa "sé"**: los mapeos OCDS devuelven
    undefined (no un objeto vacío) cuando el release no trae el dato — las claves
    undefined se eliminan antes del $set. El shape mínimo lo cubre $setOnInsert.

---

## 5. Estado: qué funciona hoy

- ✅ Ingesta RSS cada 15 min, 0 errores, con descripciones limpias (BUG-4 resuelto:
  el CDATA traía `<br/>` y entidades; además se recuperó `fechaUltimaModificacion`,
  que NUNCA había matcheado) e inciso resuelto contra la codiguera
- ✅ Ingesta OCDS 2025 completa: 35.502 llamados + 109.058 adjudicaciones, 0 errores, 71s
- ✅ Codigueras ingestadas (73 incisos, 527 UEs) + backfill de los inciso 0 históricos
- ✅ Proveedores RUPE en Mongo (~90k) — repositorio Mongo ACTIVO, CSV como vuelta atrás
- ✅ API: filtros validados, orden configurable, full-text, 404 correctos, errores con
  shape único, y respuestas SIN campos internos (_id, __v, fechaIngesta)
- ✅ Perfil de empresa: `GET /proveedores/:documento/perfil` — aggregation `$facet`
- ✅ Frontend: circuito completo navegable; filtro por inciso ahora cubre también
  los llamados que entraron solo por RSS
- ✅ Alertas NUEVO_LLAMADO de punta a punta: crear alerta en /alertas → el cron
  detecta llamados INSERTADOS → matcher → notificación en Mongo + log 🔔 →
  campanita en la navbar (contador auto-refrescado) → bandeja → detalle del llamado
- ✅ Alertas VENCIMIENTO: cron diario 8:00 + al arrancar, ventana 48h, mismo motor
  y mismo dedupe (⏰ en la bandeja). Debug: GET /licitaciones/debug/vencimientos-ahora
- ✅ estado=vigente devuelve vigentes REALES (~920, no 6.906): derivación por fecha
- ✅ Tests: 59 backend (parsers y matcher con fixtures reales) + 6 frontend — verdes
- ✅ Git al día: historia en Conventional Commits (ver `git log --oneline`)

### Comandos
```bash
# Backend dev          cd backend && npm run start:dev
# Frontend dev         cd frontend && ng serve
# Tests backend        cd backend && npx jest
# Tests frontend       cd frontend && npx ng test --watch=false
# Ingesta OCDS         cd backend && npm run ingesta:ocds        # (usa data/ocds/ocds-2025.zip)
#                      npm run ingesta:ocds -- 2024              # otro año (bajar ZIP antes)
# Ingesta codigueras   npm run ingesta:codigueras                # descarga + upsert + backfill inciso 0
# Ingesta proveedores  npm run ingesta:proveedores               # CSV data/rupe/*.csv → Mongo
# Ingesta RSS manual   GET http://localhost:3000/api/v1/licitaciones/debug/ingestar-ahora
# Drop licitaciones    docker exec -it mongodb mongosh -u admin -p admin --authenticationDatabase admin RUPE --eval "db.licitaciones.drop()"
```

---

## 6. PENDIENTES (en orden de valor sugerido)

### EN CURSO — Bloque Frontend: pulir la experiencia con los datos ya cargados
- [x] Dashboard/home en `/`: GET /estadisticas?anio (default "este año", el
      marco de referencia del autor; $match antes del $facet). Dato conocido:
      el año corriente no tiene adjudicaciones hasta su dump (enero siguiente)
      — el vacío se explica en la propia UI. Módulo estadisticas/ aparte
      porque cruza dominios (licitaciones + proveedores).
- [x] Formato: MontoPipe (es-UY + sigla: "12.345.678 UYU") y FechaRelativaPipe
      ("cierra en 3 días", por días CALENDARIO) en core/pipes/
- [x] `GET /organismos` + selector por nombre en filtros de licitaciones y
      form de alertas. OrganismosApi en core/ con shareReplay(1) (referencia
      compartida, una request por sesión). La tabla de alertas muestra nombres.
- [x] Skeletons (componente core/ui/skeleton con variantes tabla/tarjetas/
      lineas) + responsive (tablas con overflow-x-auto + min-width, navbar
      flex-wrap, paddings p-4 sm:p-8)
- [ ] Detalle de licitación: link al portal (urlOrigen), navegación mejorada,
      overflow-x-auto en su tabla de items (quedó pendiente de este pase)

### Bloque 5b — Boletín por email (PLANEADO; completa el MVP, diseño decidido)
El autor quiere multicuenta a futuro: difundir compras nuevas y avisos de
vencimiento a suscriptores. Decisiones YA tomadas (sesión 2026-07-04):
- **Puerto EmailSender** (Ports & Adapters, como ProveedoresRepository):
  adapters ResendEmailSender (fetch, sin deps) / LogEmailSender (sin API key).
  El proveedor es un detalle intercambiable — Resend NO es la arquitectura.
- **Boletín ≠ Alertas**: boletín = broadcast digest diario de nuevos llamados
  (sin criterios); alertas = personalizadas (ya existen). El boletín REUSA la
  detección de nuevos de la ingesta; no forzar uno dentro del otro.
- **Fase 1** (sin suscripción pública): colección `suscriptores` {email, activo}
  con alta manual + digest diario 8:00 + armarEmailDigest() como función pura
  + conectar email a las notificaciones de alertas existentes.
- **Fase 2**: suscripción pública con double opt-in y link de baja (tokens, SIN
  login). Preferencias del suscriptor = CriteriosAlerta + el matcher existente.
  REQUIERE dominio propio verificado (SPF/DKIM — peaje del ecosistema email,
  no del proveedor). Fase 3 (solo si el producto lo pide): cuentas con login.
- Digest antes que metralleta (96 corridas de cron ≠ 96 emails).

### Bloque 6 — Calidad e infra
- [ ] Ingestar más años OCDS (2024, 2023... — bajar ZIPs y correr script;
      lo puede hacer el autor sin sesión)
- [ ] Extraer `shared/types` a paquete compartido (hoy el frontend duplica a mano)
- [ ] e2e de endpoints, CI, dockerizar backend+frontend, Atlas para prod
- [ ] Observabilidad: health check que verifique Mongo

### Deudas chicas de alertas (anotadas)
- Tipo ADJUDICACION: declarado pero NO construible en tiempo útil (los datos
  llegan por el dump anual). Cambiaría con el scraping de la página de detalle.
- Ventana de aviso por-alerta ("avisame 7 días antes") = un campo en el schema
  de Alerta + filtrar en el scheduler de vencimientos.

### Bugs / deudas chicas conocidas
- Los 9 llamados UCC/UACM del RSS quedan con `inciso: 0` (correcto: no son un
  inciso). Si algún día importan, existe la codiguera `reporteUCCs.do`.
- `ORGANISMOS_INCISO` (shared/types/organismos.ts) quedó sin usos en runtime,
  pero tiene la clasificación `TipoOrganismo` que la codiguera oficial no trae
  (útil para facetas futuras). Decidir si se borra o se cruza con la codiguera.
- El specs de licitaciones-list / detail / perfil-empresa del frontend no existen
  (solo App y ProveedoresList tienen specs reales).

### Ideas anotadas
- Guardar el dato CRUDO (item RSS / release OCDS) junto al parseado para poder
  re-procesar la historia cuando un parser mejora.
- Scraping de la página de detalle (server-rendered, verificado viable) para
  enriquecer vigentes: pliegos adjuntos, prórrogas, aclaraciones.
- `Manual_de_Interfaz_G2B.pdf` documenta una interfaz de consulta del portal
  (en el dataset `acce-compras-estatales`).
