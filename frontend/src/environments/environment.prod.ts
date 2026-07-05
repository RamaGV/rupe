// src/environments/environment.prod.ts

export const environment = {
  production: true,
  // RELATIVA a proposito: el navegador pega al mismo origen que sirvio
  // la app, y el nginx del contenedor proxya /api al backend. Sin
  // dominios hardcodeados: la misma imagen sirve en cualquier ambiente.
  apiUrl: '/api/v1',
};