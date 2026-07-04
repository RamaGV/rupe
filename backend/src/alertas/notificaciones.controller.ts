// backend/src/alertas/notificaciones.controller.ts
import { Controller, Get, HttpCode, Param, Patch, Query } from '@nestjs/common';
import { NotificacionesService } from './notificaciones.service';

@Controller('notificaciones')
export class NotificacionesController {
  constructor(private readonly notificacionesService: NotificacionesService) {}

  // GET /notificaciones            → las últimas 50 + contador sinLeer
  // GET /notificaciones?soloNoLeidas=true
  @Get()
  listar(@Query('soloNoLeidas') soloNoLeidas?: string) {
    return this.notificacionesService.listar(soloNoLeidas === 'true');
  }

  @Patch(':id/leida')
  @HttpCode(204)
  marcarLeida(@Param('id') id: string) {
    return this.notificacionesService.marcarLeida(id);
  }
}
