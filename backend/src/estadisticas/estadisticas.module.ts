// backend/src/estadisticas/estadisticas.module.ts
import { Module } from '@nestjs/common';
import { LicitacionesModule } from '../licitaciones/licitaciones.module';
import { ProveedoresModule } from '../proveedores/proveedores.module';
import { EstadisticasController } from './estadisticas.controller';
import { OrganismoPerfilController } from './organismo-perfil.controller';
import { BanderasController } from './banderas.controller';
import { CacheCalculosService } from './cache-calculos.service';

// Módulo chico a propósito: el dashboard CRUZA dominios (licitaciones +
// proveedores) y no pertenece a ninguno de los dos — meterlo en uno
// crearía la dependencia lateral que venimos evitando.
@Module({
  imports: [LicitacionesModule, ProveedoresModule],
  controllers: [EstadisticasController, OrganismoPerfilController, BanderasController],
  providers: [CacheCalculosService],
})
export class EstadisticasModule {}
