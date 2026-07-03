// src/proveedores/proveedores.module.ts
import { Module } from '@nestjs/common';
import { IngestaModule } from '../ingesta/ingesta.module';
// LicitacionesModule exporta LicitacionesService justamente para esto:
// el perfil de empresa cruza proveedores (RUPE) con adjudicaciones (Mongo)
import { LicitacionesModule } from '../licitaciones/licitaciones.module';
import { ProveedoresController } from './proveedores.controller';
import { ProveedoresService } from './proveedores.service';

@Module({
  imports: [IngestaModule, LicitacionesModule],
  controllers: [ProveedoresController],
  providers: [ProveedoresService],
})
export class ProveedoresModule {}