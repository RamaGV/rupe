// backend/src/alertas/schemas/notificacion.schema.ts
import { Schema, SchemaFactory, Prop } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { TipoAlerta } from '../../shared/types';

export type NotificacionDocument = Notificacion & Document;

// Una notificación es un HECHO: "la alerta X matcheó el llamado Y en
// tal momento". Por eso guarda SNAPSHOTS (nombre de la alerta, resumen
// del llamado) y no referencias a resolver: si mañana borrás la alerta
// o el llamado cambia, el registro de qué se te notificó no se rompe
// ni cambia de significado.
@Schema({ timestamps: true, collection: 'notificaciones' })
export class Notificacion {
  @Prop({ required: true, index: true })
  alertaId: string;

  @Prop({ required: true })
  alertaNombre: string;

  // Snapshot del tipo de alerta que la generó: la bandeja distingue
  // "salió algo nuevo" (🔔) de "esto que te interesa cierra pronto" (⏰).
  // default para los docs anteriores a la existencia del campo.
  @Prop({ type: String, enum: TipoAlerta, required: true, default: TipoAlerta.NUEVO_LLAMADO })
  tipoAlerta: TipoAlerta;

  // El id externo del llamado (el de ARCE): alcanza para navegar al
  // detalle en el frontend (/licitaciones/:id)
  @Prop({ required: true })
  licitacionId: string;

  @Prop({ required: true })
  descripcion: string;

  @Prop({ required: true })
  organismo: string;

  @Prop({ required: true })
  tipoContratacion: string;

  @Prop()
  fechaRecepcionOfertas?: Date;

  @Prop({ required: true, default: false, index: true })
  leida: boolean;
}

export const NotificacionSchema = SchemaFactory.createForClass(Notificacion);

// La misma alerta no debería notificar dos veces el mismo llamado —
// pasaría si un llamado se borrara y re-ingresara como "nuevo". El índice
// único convierte ese caso raro en un error de duplicado que se ignora,
// en vez de una notificación repetida que molesta.
NotificacionSchema.index({ alertaId: 1, licitacionId: 1 }, { unique: true });
