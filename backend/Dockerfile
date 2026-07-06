# backend/Dockerfile — multi-stage. Build context: la RAÍZ del repo
# (el paquete @rupe/shared vive en packages/ — ver docker-compose.yml).
FROM node:22-alpine AS build
WORKDIR /app
COPY backend/package*.json ./backend/
RUN cd backend && npm ci
COPY packages ./packages
COPY backend ./backend
RUN cd backend && npm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY backend/package*.json ./
RUN npm ci --omit=dev
# dist trae backend/src + packages compilados (los shims re-exportan
# con rutas relativas que sobreviven dentro de dist)
COPY --from=build /app/backend/dist ./dist

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s \
  CMD wget -qO- http://localhost:3000/api/v1/health || exit 1

CMD ["node", "dist/backend/src/main"]
