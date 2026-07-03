// backend/src/ingesta/ingesta.module.ts
import { Module } from '@nestjs/common';
import { PROVEEDORES_REPOSITORY } from './repositories/proveedores-repository.interface';
import { ProveedoresCsvRepository } from './repositories/proveedores-csv.repository';

@Module({
  providers: [
    {
      provide: PROVEEDORES_REPOSITORY,   // el token (la interfaz)
      useClass: ProveedoresCsvRepository, // la implementación concreta
    },
  ],
  exports: [PROVEEDORES_REPOSITORY],
})
export class IngestaModule {}