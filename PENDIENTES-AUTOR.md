# Pendientes del autor (cosas que solo vos podés hacer)

## Verificaciones pendientes de la última sesión
- [ ] GitHub → Actions: últimos 3 runs en verde (56c8cdf, 2bfc052, 722504b)
- [ ] `docker compose up --build` (re-verificación del build context raíz)
- [ ] `cd backend && npm run start:dev` + vuelta por la web (flujo de siempre)

## Cuentas y compras (desbloquean fases del ROADMAP)
- [ ] Cuenta en MongoDB Atlas (tier M0 gratis) → URI al `.env` [Fase A]
- [ ] Elegir NOMBRE del producto + comprar dominio (~10 USD/año) [Fase A]
- [ ] Hosting: cuenta en Render/Railway/Fly + Vercel/Cloudflare [Fase A]
- [ ] API key de Resend (cuando llegue el email 5b) [Fase C]

## Datos (sin sesión, cuando quieras)
- [ ] Bajar ZIPs OCDS 2024, 2023... → `backend/data/ocds/ocds-<año>.zip`
      y correr `npm run ingesta:ocds -- <año>` (links en ROADMAP.md)
- [ ] Bajar el CSV RUPE del mes nuevo cuando salga → `backend/data/rupe/`
      y correr `npm run ingesta:proveedores`

## Presentación
- [ ] Sacar capturas / grabar GIF del dashboard, filtros y alertas → README
- [ ] Pensar el pitch de una línea del producto (para el README y LinkedIn)
