// backend/src/push/push.controller.ts
import { Body, Controller, Delete, Get, HttpCode, Post, Query } from '@nestjs/common';
import { PushService } from './push.service';

@Controller('push')
export class PushController {
  constructor(private readonly pushService: PushService) {}

  // el frontend la necesita para PushManager.subscribe()
  @Get('clave-publica')
  clavePublica() {
    return { clave: this.pushService.getClavePublica() };
  }

  @Post('suscripciones')
  suscribir(@Body() sub: { endpoint: string; keys: { p256dh: string; auth: string } }) {
    return this.pushService.suscribir(sub);
  }

  // por query: DELETE con body es terreno pantanoso entre proxies
  @Delete('suscripciones')
  @HttpCode(204)
  desuscribir(@Query('endpoint') endpoint: string) {
    return this.pushService.desuscribir(endpoint);
  }
}
