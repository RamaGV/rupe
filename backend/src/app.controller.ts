// src/app.controller.ts
import { Controller, Get, Res } from '@nestjs/common';
import type { Response } from 'express';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  // 200 sano / 503 degradado: el contrato que esperan los load balancers
  // y orquestadores (Docker healthcheck, k8s liveness). passthrough:
  // seteamos el código a mano pero Nest sigue serializando el body.
  @Get('health')
  async getHealth(@Res({ passthrough: true }) res: Response) {
    const salud = await this.appService.getHealth();
    if (salud.status !== 'ok') res.status(503);
    return salud;
  }
}
