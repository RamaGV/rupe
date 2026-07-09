# Handoff — Etapa 2: de producto completo a producto público

> Continúa a `handoff.MD` (que queda como referencia de arquitectura y
> decisiones 1–14). Actualizado: 2026-07-08.
> Reglas de trabajo con el autor: las mismas de siempre (ver handoff.MD §1).

## Estado al cierre de la Etapa 1 (todo verde, todo pusheado)

MVP completo + Fase B del ROADMAP entera: dashboard con 3 gráficos
interactivos (Chart.js reactivo al tema), perfil de organismo (el grafo
del mercado navegable en círculo), radar de precios, export CSV, Swagger
en /api/docs, **modo oscuro** (paleta por variables CSS de Tailwind v4,
cero cambios en templates), navbar sticky, footer con firma del autor,
CTA del boletín en la portada. 60 jest + 14 e2e + 9 vitest + CI verde.

**Pendiente de verificación del autor** (está en remoto): la gran tanda
descrita en PENDIENTES-AUTOR.md + el tour completo de la última sesión.

## La Etapa 2, en orden sugerido

### 2.1 — Publicar (bloqueado por cuentas del autor: Atlas, hosting, dominio)
Todo lo técnico está pronto: health 200/503, Docker con context raíz,
CI. Es crear cuentas y apuntar variables. Ver ROADMAP.md Fase A.

### 2.2 — SSR/prerender (sesión DEDICADA: Tema/Push/Chart usan APIs de
### navegador — localStorage, navigator, canvas — que explotan en servidor
### sin guards; el trabajo real es aislarlas, no el ng add)
Angular SSR para que Google indexe cada licitación → tráfico orgánico.
Además habilita OpenGraph por página ("compartí este llamado" con
tarjeta linda). Es la última carta grande que no necesita al autor.

### 2.3 — Boletín público (cuando haya dominio: spec en handoff.MD §5b)
Suscripción con double opt-in, digest diario, preferencias = criterios
del matcher existente.

## Ideas nuevas para la web (exploradas esta sesión, por valor)

1. [x] **Notificaciones push del navegador — HECHO (2026-07-08)**: módulo
   push/ (claves VAPID autogeneradas y persistidas en Mongo, cero config),
   canal enchufado al motor de alertas (mejor esfuerzo, suscripciones
   muertas se autolimpian con el 410), sw.js mínimo (solo push, sin caché)
   y botón en /notificaciones. OJO: requiere HTTPS o localhost (regla de
   los navegadores). (era: LA alternativa al email
   que NO necesita dominio ni proveedor: el service worker recibe push
   del backend (web-push, gratis) y avisa aunque la pestaña esté cerrada.
   Convierte el boletín en app instalable en el teléfono. Candidata
   fuerte para arrancar la Etapa 2 sin esperar cuentas.
2. [x] **"Crear alerta desde esta búsqueda"** — HECHO (2026-07-08): botón
   azul en la barra de filtros; texto→palabrasClave, organismo→incisos,
   tipo→tiposContratacion; navega a /alertas al crear.
3. [x] **Licitaciones similares** — HECHO (2026-07-08): GET /licitaciones/
   :id/similares (mismo inciso + tipo, 5 más recientes) + sección en el detalle.
4. **Mapa de Uruguay por intendencias** — el gasto de los incisos 80–99
   coloreado por departamento. Visual, compartible, periodístico.
5. [x] **Página "Metodología"** — HECHO (2026-07-08): /metodologia con
   fuentes, decisiones de presentación, limitaciones conocidas y contacto;
   linkeada desde el footer.
6. [x] **Watchlist local** — HECHO (2026-07-08): ⭐ en la lista, página
   /guardadas (snapshot en localStorage, cero backend), link en navbar.
7. [x] **Glosario** — HECHO (2026-07-08): /glosario con 12 términos en
   lenguaje llano, linkeado del footer.
8. **Timeline del llamado** — requiere guardar el dato CRUDO de cada
   release (idea ya anotada en handoff.MD): prórrogas y cambios visibles.
9. [x] **Accesibilidad (primera pasada)** — HECHO (2026-07-08): lang=es,
   :focus-visible global con el azul del tema, aria-label/aria-pressed en
   botones de ícono (tema, campanita, estrella, guardadas). Queda para
   una segunda pasada: aria en tablas y navegación por teclado del form.

## Recordatorios operativos
- Los archivos de datos van en backend/data/ (gitignoreado); links de
  descarga en ROADMAP.md.
- Scripts: ingesta:ocds / ingesta:proveedores / ingesta:codigueras.
- El autor verifica con SUS ojos; checklists, no servidores por él.

## Etapa 3 — ideas aprobadas por el autor (2026-07-08), por valor/esfuerzo

**Análisis e investigación (el filón periodístico)**
1. [x] **Banderas rojas 🚩** — HECHO (2026-07-08): /banderas-rojas con 3
   detectores (fraccionamiento ≥5 CD/año mismo par organismo-proveedor,
   mono-organismo ≥8 adj., directas >1M UYU), todo navegable y con el
   disclaimer "señales, no acusaciones". Nota: "recién inscriptos" NO es
   detectable (RUPE no trae fecha de alta). (era: patrones calculables:
   compras directas repetidas al mismo proveedor bajo el tope (fraccionamiento),
   adjudicaciones a empresas recién inscriptas en RUPE, proveedores que solo
   ganan en un organismo. LA feature citables-por-periodistas.
2. **Índice de concentración** en perfil de organismo: % del gasto del top-3
   de proveedores.
3. [x] **Serie temporal en el radar** — HECHO (2026-07-08).
4. **Comparador de proveedores** — dos RUTs lado a lado.

**Para el usuario proveedor**
5. **Filtro por rango de monto** en la lista (extender DTO).
6. **Calendario de cierres** — vista mensual de vencimientos.

**Producto y difusión**
7. [x] **Resumen semanal autogenerado** — HECHO (2026-07-08): /semana
   (GET /estadisticas/semana), linkeado desde el dashboard. (era:** — "Semana del X": lo nuevo/cerrado/
   adjudicado. Se fabrica solo y ES el cuerpo del futuro boletín email (5b).
8. **Datos re-publicados** (JSON/CSV mensual normalizado) — infraestructura
   cívica, credibilidad, comunidad.

Top-3 del autor+asistente: 1, 7 y 3.
