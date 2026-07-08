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
3. **Licitaciones similares** en el detalle (mismo organismo + tipo, o
   texto parecido) — retiene navegación y sirve para comparar precios.
4. **Mapa de Uruguay por intendencias** — el gasto de los incisos 80–99
   coloreado por departamento. Visual, compartible, periodístico.
5. [x] **Página "Metodología"** — HECHO (2026-07-08): /metodologia con
   fuentes, decisiones de presentación, limitaciones conocidas y contacto;
   linkeada desde el footer.
6. **Watchlist local** — ⭐ licitaciones guardadas en localStorage, sin
   cuenta. Barato y útil.
7. **Glosario de compras públicas** (qué es una CD, una LA, el RUPE) —
   útil + SEO de cola larga.
8. **Timeline del llamado** — requiere guardar el dato CRUDO de cada
   release (idea ya anotada en handoff.MD): prórrogas y cambios visibles.
9. **Accesibilidad** — pasada de a11y (focus visible, aria en tablas,
   contraste del modo oscuro ya verificado en OKLCH).

## Recordatorios operativos
- Los archivos de datos van en backend/data/ (gitignoreado); links de
  descarga en ROADMAP.md.
- Scripts: ingesta:ocds / ingesta:proveedores / ingesta:codigueras.
- El autor verifica con SUS ojos; checklists, no servidores por él.
