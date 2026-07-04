// src/main.ts
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './shared/filters/global-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Embudo único de errores: shape consistente + log de los 500.
  // (Alternativa: registrarlo como provider APP_FILTER si algún día
  // necesita inyectar dependencias — hoy no las necesita.)
  app.useGlobalFilters(new GlobalExceptionFilter());

  // Validación global: todo @Query()/@Body() tipado con un DTO se valida
  // y transforma automáticamente antes de llegar al controller.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // elimina propiedades que el DTO no declara
      transform: true, // instancia el DTO real (aplica @Type y defaults)
    }),
  );

  // CORS: permite que Angular (localhost:4200) consuma esta API
  app.enableCors({
    origin: process.env.CORS_ORIGIN ?? 'http://localhost:4200',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Prefijo global para todas las rutas: /api/v1/...
  app.setGlobalPrefix('api/v1');

  const port = process.env.PORT ?? 3000;
  await app.listen(port);

  console.log(`🚀 Backend corriendo en http://localhost:${port}/api/v1`);
}

bootstrap();