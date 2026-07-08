// backend/src/push/push.schemas.ts
import { Schema, SchemaFactory, Prop } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type PushSuscripcionDocument = PushSuscripcion & Document;

// Una suscripción del navegador (el objeto PushSubscription serializado).
// El endpoint es único: el mismo navegador re-suscribiendo se upsertea.
@Schema({ timestamps: true, collection: 'push_suscripciones' })
export class PushSuscripcion {
  @Prop({ required: true, unique: true })
  endpoint: string;

  @Prop({ type: Object, required: true })
  claves: { p256dh: string; auth: string };
}

export const PushSuscripcionSchema = SchemaFactory.createForClass(PushSuscripcion);

export type ConfigVapidDocument = ConfigVapid & Document;

// Las claves VAPID identifican a ESTE servidor ante los push services
// (deben ser estables). Se autogeneran la primera vez y viven en Mongo:
// cero configuración manual, y sobreviven a contenedores nuevos.
@Schema({ collection: 'config' })
export class ConfigVapid {
  @Prop({ required: true, unique: true })
  clave: string; // "vapid"

  @Prop({ required: true })
  publica: string;

  @Prop({ required: true })
  privada: string;
}

export const ConfigVapidSchema = SchemaFactory.createForClass(ConfigVapid);
