// backend/src/ingesta/ingesta.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PROVEEDORES_REPOSITORY } from './repositories/proveedores-repository.interface';
import { ProveedoresMongoRepository } from './repositories/proveedores-mongo.repository';
import { Proveedor, ProveedorSchema } from './schemas/proveedor.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Proveedor.name, schema: ProveedorSchema }]),
  ],
  providers: [
    {
      provide: PROVEEDORES_REPOSITORY, // el token (la interfaz)
      // El swap prometido en el diseño del Bloque 2: de
      // ProveedoresCsvRepository a Mongo cambiando SOLO esta línea.
      // (El adaptador CSV sigue en repositories/ — es la vuelta atrás
      // y la prueba de que el contrato no sabe de infraestructura.)
      useClass: ProveedoresMongoRepository,
    },
  ],
  exports: [PROVEEDORES_REPOSITORY],
})
export class IngestaModule {}
