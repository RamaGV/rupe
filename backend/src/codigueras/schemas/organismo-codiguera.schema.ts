// backend/src/codigueras/schemas/organismo-codiguera.schema.ts
import { Schema, SchemaFactory, Prop } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type OrganismoCodigueraDocument = OrganismoCodiguera & Document;

@Schema({ _id: false })
class UnidadEjecutoraSchema {
  @Prop({ required: true })
  codigo: number;

  @Prop({ required: true })
  nombre: string;

  // false = tiene alguna variante del marcador "NO VIGENTE" en la codiguera
  @Prop({ required: true })
  vigente: boolean;
}

// Un documento por inciso, con sus unidades ejecutoras embebidas:
// siempre se leen juntas (es la codiguera "66-1" → nombres de OCDS)
// y son pocas (~527 UEs repartidas en 73 incisos).
@Schema({ timestamps: true, collection: 'organismos' })
export class OrganismoCodiguera {
  // Código de inciso del SICE: la clave del upsert y del cruce con
  // OCDS parties[].id ("66-1" → inciso 66, unidad ejecutora 1)
  @Prop({ required: true, unique: true, index: true })
  inciso: number;

  @Prop({ required: true })
  nombre: string;

  // Nombre pre-normalizado (sin tildes, minúsculas): la clave del cruce
  // por nombre desde el RSS. Se calcula al ingestar, no en cada lookup.
  @Prop({ required: true, index: true })
  nombreNormalizado: string;

  @Prop({ type: [UnidadEjecutoraSchema], default: [] })
  unidadesEjecutoras: UnidadEjecutoraSchema[];

  @Prop({ required: true, default: () => new Date() })
  fechaIngesta: Date;
}

export const OrganismoCodigueraSchema = SchemaFactory.createForClass(OrganismoCodiguera);
