# Roadmap — de MVP a producto profesional

> Visión: datos públicos que le importan a gente real (proveedores,
> periodistas, académicos), limpios, cruzados y presentados de forma
> interactiva. El proyecto es a la vez producto y carta de presentación
> del servicio de programación del autor.

## Fase A — Existir en internet (máximo retorno por hora)
- [ ] **Deploy**: Atlas M0 (gratis) + backend en Render/Railway/Fly.io +
      frontend en Vercel/Cloudflare Pages — o el docker-compose en un VPS.
      Todo lo difícil ya está (health 200/503, Docker, env vars).
- [ ] **Dominio propio** (~10 USD/año): URL seria + desbloquea el email 5b
      (SPF/DKIM). Nombre de producto propio (no "RUPE", jerga interna).
- [ ] Meta tags OpenGraph + favicon + capturas/GIF en el README: que
      compartirlo en LinkedIn muestre una tarjeta, no un link pelado.
- [ ] Uptime monitor gratuito (UptimeRobot) apuntando a /api/v1/health.

## Fase B — Los datos como historia (la idea central del autor)
- [ ] **Ingestar 2002–2024**: las tendencias multianuales convierten el
      visor en herramienta de análisis ("cuánto creció el gasto de ASSE
      en 10 años"). Solo bajar ZIPs y correr el script existente.
- [x] **Gráficos en el dashboard**: actividad mensual, dona por tipo y
      ranking navegable de proveedores (Chart.js sobre los $facet
      que ya existen): evolución mensual de montos por moneda, distribución
      por tipo, ranking de proveedores por monto ganado.
- [x] **Perfil de organismo** (/organismos/:inciso): espejo del perfil de
      empresa — quién le
      vende, cuánto gasta, en qué. Con ambas caras queda el grafo completo
      del mercado estatal.
- [x] **Radar de precios** (/radar): busca por texto en items adjudicados,
      resumen min/promedio/max POR MONEDA + muestras navegables. (era: precio
      unitario histórico por artículo — "¿a cuánto le vendió la competencia
      este ítem al Estado?". Los datos YA están (items OCDS con precios).
- [ ] Export CSV de cualquier búsqueda ("modo periodista").

## Fase C — Alcance y comunidad
- [ ] **SEO/SSR**: prerender de Angular para que Google indexe cada
      licitación → tráfico orgánico de gente buscando exactamente eso.
- [ ] **Boletín email** (5b, spec en handoff.MD): digest diario + double
      opt-in cuando haya dominio. Suscriptores = la audiencia propia.
- [x] **API pública documentada** — Swagger en /api/docs, generada de los
      DTOs reales vía plugin de nest-cli. (era: media hora de
      trabajo y demuestra profesionalismo — y terceros pueden construir
      encima (más visibilidad).

## Fase D — Producto serio (cuando haya usuarios)
- [ ] Multiusuario con login (fase 3 del 5b; el modelo ya lo anticipa).
- [ ] Rate limiting + helmet (API pública expuesta).
- [ ] Logs estructurados + métricas básicas.
- [ ] Posible modelo de servicio: alertas premium, reportes a medida,
      integraciones para empresas proveedoras.

## Fuentes de datos — links de descarga
| Qué | Dónde |
|---|---|
| Dumps OCDS anuales (ZIP por año, 2002–2025) | https://catalogodatos.gub.uy/dataset/arce-datos-historicos-de-compras → `backend/data/ocds/ocds-<año>.zip` |
| CSV RUPE (un dataset por año, dentro los meses) | https://catalogodatos.gub.uy/dataset/arce-registro-unico-de-proveedores-del-estado-rupe-2026 (cambiar el año en la URL; 2022 y anteriores usan prefijo `acce-`) → `backend/data/rupe/` |
| Codigueras XML (descarga sola el script) | https://catalogodatos.gub.uy/dataset/acce-compras-estatales — los XML se sirven desde comprasestatales.gub.uy (`reporteIncisos.do`, `reporteUnidadesEjecutoras.do`) |
| RSS de vigentes (lo consume el cron) | https://www.comprasestatales.gub.uy/consultas/rss |

Nota: catalogodatos.gub.uy rechaza clientes no-browser (usar el navegador
o `curl -A "Mozilla/5.0" -k`). Los archivos van a `backend/data/` (gitignoreado).
