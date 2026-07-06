# frontend/Dockerfile — build de Angular + nginx. Build context: la RAÍZ
# del repo (importa @rupe/shared vía tsconfig paths → ../packages).
FROM node:22-alpine AS build
WORKDIR /app
COPY frontend/package*.json ./frontend/
RUN cd frontend && npm ci
COPY packages ./packages
COPY frontend ./frontend
RUN cd frontend && npx ng build

FROM nginx:alpine
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/frontend/dist/frontend/browser /usr/share/nginx/html
EXPOSE 80
