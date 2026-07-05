// backend/src/codigueras/codigueras.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  OrganismoCodiguera,
  OrganismoCodigueraSchema,
} from './schemas/organismo-codiguera.schema';
import { CodiguerasService } from './codigueras.service';
import { CodiguerasController } from './codigueras.controller';

// Solo el lookup vive en el grafo de la app. CodiguerasIngestService
// se ensambla únicamente en el script batch (mismo patrón que
// OcdsIngestService): la ingesta no es una operación de runtime.
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: OrganismoCodiguera.name, schema: OrganismoCodigueraSchema },
    ]),
  ],
  controllers: [CodiguerasController],
  providers: [CodiguerasService],
  exports: [CodiguerasService],
})
export class CodiguerasModule {}
