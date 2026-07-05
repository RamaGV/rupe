# backend/Dockerfile — multi-stage: la imagen final NO lleva el
# compilador de TS ni las devDependencies, solo dist/ y lo de runtime.

FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist

EXPOSE 3000
# El healthcheck usa el /health que verifica Mongo de verdad: si la
# dependencia cae, Docker marca el contenedor unhealthy (y un
# orquestador lo reinicia o saca del balanceo).
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s \
  CMD wget -qO- http://localhost:3000/api/v1/health || exit 1

CMD ["node", "dist/main"]
