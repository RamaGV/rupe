// backend/src/alertas/alertas.controller.ts
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { AlertasService } from './alertas.service';
import { CrearAlertaDto, ActualizarAlertaDto } from './dto/crear-alerta.dto';

@Controller('alertas')
export class AlertasController {
  constructor(private readonly alertasService: AlertasService) {}

  @Post()
  crear(@Body() dto: CrearAlertaDto) {
    return this.alertasService.crear(dto);
  }

  @Get()
  listar() {
    return this.alertasService.listar();
  }

  // PATCH (no PUT): actualización parcial — pausar una alerta es
  // { "activa": false }, sin re-mandar nombre y criterios.
  @Patch(':id')
  actualizar(@Param('id') id: string, @Body() dto: ActualizarAlertaDto) {
    return this.alertasService.actualizar(id, dto);
  }

  // 204: el DELETE exitoso no tiene nada para decir.
  @Delete(':id')
  @HttpCode(204)
  eliminar(@Param('id') id: string) {
    return this.alertasService.eliminar(id);
  }
}
