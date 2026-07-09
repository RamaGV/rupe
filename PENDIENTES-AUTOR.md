# EMPEZÁ ACÁ — Pendientes del autor

> Actualizado 2026-07-09. Todo lo de abajo requiere TUS ojos, tus cuentas
> o tus decisiones. El estado técnico completo está en handoff-etapa-2.md;
> la visión en ROADMAP.md.

## 0. Dato clave antes de arrancar
La base YA tiene el histórico completo **2002–2025**: ~600k llamados y
~1.3M de adjudicaciones (23 años ingestados el 2026-07-08, 0 errores).
No tenés que ingestar nada — solo levantar y mirar.

## 1. La gran verificación (una sesión tuya, ~30 min)
Levantá backend (`cd backend && npm run start:dev`) y frontend (`ng serve`):

- [ ] **Dashboard** en "Histórico completo": 24 años de datos, 3 gráficos
      (actividad mensual, dona por tipo, ranking de proveedores navegable)
- [ ] **Modo oscuro** 🌙 (toggle en navbar) — mirá los charts redibujarse
- [ ] Círculo completo: organismo del top → su perfil (con el **índice de
      concentración** del top-3) → proveedor → su perfil → **📄 Informe
      descargable** (probá Ctrl+P → Guardar como PDF) y **⬇ CSV**
- [ ] **/radar**: buscá "papel" — resumen por moneda + LÍNEA de evolución
      del precio (¡ahora con 24 años!) + muestras navegables
- [ ] **/banderas-rojas**: fraccionamiento, mono-organismo, directas grandes
- [ ] **/semana**: el resumen semanal autogenerado
- [ ] **/comparador**: dos empresas de un mismo rubro, lado a lado
- [ ] Lista de licitaciones: filtro por organismo + **rango de monto UYU** +
      botón **"🔔 Crear alerta con esta búsqueda"** + **⬇ CSV**
- [ ] Detalle: similares del organismo, "cierra en N días", chip apertura
      electrónica; **⭐ guardadas** (estrella en la lista → /guardadas)
- [ ] **Push del navegador**: /notificaciones → "Activar avisos" → borrá una
      licitación vigente de Mongo → GET /licitaciones/debug/ingestar-ahora →
      la notificación llega CON LA PESTAÑA CERRADA
- [ ] /metodologia y /glosario (footer) + títulos de pestaña + tu firma al pie
- [ ] `docker compose up --build` (pendiente desde el refactor shared)
- [ ] GitHub → Actions: todo verde
- [ ] Swagger: http://localhost:3000/api/docs

## 2. Cuentas y compras (desbloquean el deploy — Fase A)
- [ ] MongoDB Atlas (M0 gratis) → URI al `.env`
- [ ] Nombre del producto + dominio (~10 USD/año) — también desbloquea
      el email (5b) y el OG serio
- [ ] Hosting: Render/Railway/Fly (backend) + Vercel/Cloudflare (frontend)
- [ ] API key de Resend (recién para el boletín email, post-deploy)

## 3. Presentación (tu carta de venta)
- [ ] Capturas / GIF del dashboard, radar y banderas → README
- [ ] Pitch de una línea (README + LinkedIn)

## 4. Datos — mantenimiento eventual
- [ ] CSV de RUPE del mes nuevo cuando salga → `backend/data/rupe/` +
      `npm run ingesta:proveedores`
- [ ] Dump OCDS 2026 cuando ARCE lo publique (enero 2027) → mismo flujo

## Para la próxima sesión conmigo (elegí una)
- **Deploy** (si ya hiciste el punto 2) — el proyecto sale a internet
- **SSR/prerender** — SEO y OG por página (sesión dedicada)
- **Mapa de Uruguay por intendencias** — el visual que falta
