# frontend/Dockerfile — build de Angular + nginx para servir estáticos.
# La imagen final pesa ~50MB: nginx alpine + el dist, nada de Node.

FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# build de producción: usa environment.prod.ts (apiUrl relativa /api/v1)
RUN npx ng build

FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/frontend/browser /usr/share/nginx/html
EXPOSE 80
