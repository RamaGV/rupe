// backend/src/alertas/schemas/alerta.schema.ts
import { Schema, SchemaFactory, Prop } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { TipoContratacion } from '../../shared/types/enums';
import { TipoAlerta } from '../../shared/types';

export type AlertaDocument = Alerta & Document;

// Los criterios persistidos son el SUBCONJUNTO construible hoy:
// CriteriosAlerta (shared/types) también declara montoMinimo/montoMaximo
// y familias, pero el RSS —la única fuente de llamados nuevos— no trae
// montos ni items. Un schema que los aceptara prometería filtros que
// nunca filtran: mentira silenciosa. Se agregan cuando alguna fuente
// los haga matcheables (ej: scraping de la página de detalle).
@Schema({ _id: false })
class CriteriosSchema {
  @Prop({ type: [String], default: undefined })
  palabrasClave?: string[];

  @Prop({ type: [Number], default: undefined })
  incisos?: number[];

  @Prop({ type: [String], enum: TipoContratacion, default: undefined })
  tiposContratacion?: TipoContratacion[];
}

// Sin campo "usuario": decisión explícita de single-user (no hay auth
// en el sistema). Multiusuario = agregar el dueño acá + filtrar por él.
@Schema({ timestamps: true, collection: 'alertas' })
export class Alerta {
  @Prop({ required: true })
  nombre: string;

  @Prop({ type: String, enum: TipoAlerta, required: true, index: true })
  tipo: TipoAlerta;

  @Prop({ type: CriteriosSchema, required: true })
  criterios: CriteriosSchema;

  // El motor solo carga las activas: pausar una alerta no la borra
  // (los criterios afinados cuestan armarlos).
  @Prop({ required: true, default: true, index: true })
  activa: boolean;
}

export const AlertaSchema = SchemaFactory.createForClass(Alerta);
