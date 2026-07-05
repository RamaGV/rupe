// backend/src/estadisticas/estadisticas.module.ts
import { Module } from '@nestjs/common';
import { LicitacionesModule } from '../licitaciones/licitaciones.module';
import { ProveedoresModule } from '../proveedores/proveedores.module';
import { EstadisticasController } from './estadisticas.controller';

// Módulo chico a propósito: el dashboard CRUZA dominios (licitaciones +
// proveedores) y no pertenece a ninguno de los dos — meterlo en uno
// crearía la dependencia lateral que venimos evitando.
@Module({
  imports: [LicitacionesModule, ProveedoresModule],
  controllers: [EstadisticasController],
})
export class EstadisticasModule {}
