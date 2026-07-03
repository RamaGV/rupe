// src/licitaciones/schemas/licitacion.schema.ts
import { Schema, SchemaFactory, Prop } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import {
  TipoContratacion,
  EstadoLlamado,
  Moneda,
} from '../../shared/types/enums';

// HydratedDocument: el tipo que Mongoose te devuelve en runtime
// (Licitacion + los métodos de documento de Mongo, como .save())
export type LicitacionDocument = Licitacion & Document;

// Sub-schema embebido: no es una colección propia, vive DENTRO
// del documento de Licitacion (así evitamos un JOIN para algo
// que siempre se lee junto).
@Schema({ _id: false })
class OrganismoSchema {
  @Prop({ required: true })
  inciso: number;

  @Prop({ required: true })
  nombreInciso: string;

  @Prop()
  unidadEjecutora: string;
}

@Schema({ _id: false })
class ItemLlamadoSchema {
  @Prop({ required: true })
  numero: number;

  @Prop()
  codigoArticulo: number;

  @Prop({ required: true })
  descripcion: string;

  @Prop()
  cantidad: number;

  @Prop()
  unidad: string;

  @Prop()
  precioUnitario?: number;

  @Prop({ type: String, enum: Moneda })
  moneda: Moneda;
}

@Schema({ _id: false })
class ContactoSchema {
  @Prop()
  nombre?: string;

  @Prop()
  email?: string;

  @Prop()
  telefono?: string;
}

@Schema({ _id: false })
class AdjudicacionSchema {
  @Prop()
  estado: string;

  @Prop({ type: Object })
  proveedor?: {
    tipoDocumento: string;
    numeroDocumento: string;
    razonSocial: string;
  };

  @Prop()
  montoTotal?: number;

  @Prop({ type: String, enum: Moneda })
  moneda?: Moneda;

  @Prop()
  fechaAdjudicacion?: Date;
}

// timestamps: true agrega automáticamente createdAt/updatedAt -
// nos sirve para saber cuándo detectamos el registro por primera vez
// vs. cuándo lo tocamos por última vez en un refresh del RSS.
@Schema({ timestamps: true, collection: 'licitaciones' })
export class Licitacion {
  // El id real del portal ARCE (no el _id de Mongo). Es el campo
  // que usamos para el upsert: "si ya existe este id, actualizá;
  // si no existe, insertá". unique + index para que el upsert sea rápido.
  @Prop({ required: true, unique: true, index: true })
  id: string;

  @Prop({ required: true })
  numeroCompra: string;

  @Prop({ required: true })
  anio: number;

  @Prop({ type: String, enum: TipoContratacion, required: true, index: true })
  tipo: TipoContratacion;

  @Prop({ type: String, enum: EstadoLlamado, required: true, index: true })
  estado: EstadoLlamado;

  @Prop({ default: false })
  aperturaElectronica: boolean;

  @Prop({ type: OrganismoSchema, required: true })
  organismo: OrganismoSchema;

  // index: 'text' habilita búsqueda full-text de Mongo sobre este
  // campo (lo usamos en el filtro de texto libre del frontend).
  @Prop({ required: true, index: 'text' })
  descripcion: string;

  @Prop({ type: [ItemLlamadoSchema], default: [] })
  items: ItemLlamadoSchema[];

  // Contacto del responsable del llamado (viene de los dumps OCDS;
  // el RSS no lo trae)
  @Prop({ type: ContactoSchema })
  contacto?: ContactoSchema;

  @Prop({ type: AdjudicacionSchema })
  adjudicacion?: AdjudicacionSchema;

  @Prop({ required: true, index: true })
  fechaPublicacion: Date;

  // El campo más consultado desde el frontend (ordenar por cierre,
  // filtrar "cierra en las próximas 48h") - lo indexamos.
  @Prop({ index: true })
  fechaRecepcionOfertas?: Date;

  @Prop()
  fechaUltimaModificacion?: Date;

  @Prop({ required: true })
  urlOrigen: string;

  @Prop({ required: true, default: () => new Date() })
  fechaIngesta: Date;
}

export const LicitacionSchema = SchemaFactory.createForClass(Licitacion);

// Índice compuesto: las queries más comunes del dashboard van a ser
// "vigentes, ordenadas por fecha de apertura ascendente" - este índice
// las acelera sin que tengas que pensarlo en cada query.
LicitacionSchema.index({ estado: 1, fechaRecepcionOfertas: 1 });

// El cruce del perfil de empresa: "todas las adjudicaciones ganadas por
// el RUT X". sparse: solo indexa docs que tienen el campo (los vigentes
// sin adjudicación no ocupan lugar en el índice).
LicitacionSchema.index(
  { 'adjudicacion.proveedor.numeroDocumento': 1 },
  { sparse: true },
);