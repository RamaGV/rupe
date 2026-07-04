// backend/src/shared/filters/global-exception.filter.ts
//
// Embudo único de errores de la API. @Catch() sin argumentos = atrapa TODO
// lo que escape de los controllers, sea un HttpException tirado a propósito
// (NotFoundException, los 400 del ValidationPipe...) o un error inesperado
// (Mongo caído, un bug). Garantiza dos cosas:
//
// 1. Shape consistente: el cliente siempre recibe el mismo JSON de error,
//    venga de donde venga el problema.
// 2. Los errores NO-HTTP (bugs reales) se loguean con stack completo acá,
//    pero salen al cliente como un 500 genérico — nunca filtramos detalles
//    internos (rutas de archivos, queries, versiones) en la respuesta.

import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';

// La forma ÚNICA de error de esta API
export interface ErrorApi {
  statusCode: number;
  error: string;
  mensajes: string[];
  ruta: string;
  timestamp: string;
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let statusCode: number = HttpStatus.INTERNAL_SERVER_ERROR;
    let error = 'Internal Server Error';
    let mensajes = ['Error interno del servidor'];

    if (exception instanceof HttpException) {
      // Errores "esperados": los tiramos nosotros o el ValidationPipe.
      statusCode = exception.getStatus();
      const body = exception.getResponse();

      if (typeof body === 'string') {
        mensajes = [body];
        error = exception.name;
      } else {
        // El ValidationPipe manda message como ARRAY (una entrada por
        // regla violada); NotFoundException lo manda como string.
        // Normalizamos siempre a array: el cliente no adivina.
        const b = body as { message?: string | string[]; error?: string };
        mensajes = Array.isArray(b.message)
          ? b.message
          : [b.message ?? exception.message];
        error = b.error ?? exception.name;
      }
    } else {
      // Error inesperado: ESTO es un bug o una falla de infra.
      // Log completo para nosotros, respuesta opaca para el cliente.
      const stack = exception instanceof Error ? exception.stack : String(exception);
      this.logger.error(`${request.method} ${request.url} → ${stack}`);
    }

    const cuerpo: ErrorApi = {
      statusCode,
      error,
      mensajes,
      ruta: request.url,
      timestamp: new Date().toISOString(),
    };

    response.status(statusCode).json(cuerpo);
  }
}
