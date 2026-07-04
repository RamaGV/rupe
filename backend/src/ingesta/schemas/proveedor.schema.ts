// backend/src/ingesta/schemas/proveedor.schema.ts
import { Schema, SchemaFactory, Prop } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { TipoDocumento, EstadoProveedor } from '../../shared/types/enums';

export type ProveedorDocument = Proveedor & Document;

@Schema({ _id: false })
class DireccionFiscalSchema {
  @Prop({ required: true })
  pais: string;

  @Prop()
  departamento?: string;

  @Prop()
  localidad?: string;

  @Prop()
  domicilio?: string;
}

@Schema({ timestamps: true, collection: 'proveedores' })
export class Proveedor {
  // La clave del dominio (== supplier.id "R/..." sin prefijo en OCDS,
  // == identificacion_prov en el CSV de RUPE) y del upsert de la ingesta.
  @Prop({ required: true, unique: true, index: true })
  numeroDocumento: string;

  @Prop({ type: String, enum: TipoDocumento, required: true })
  tipoDocumento: TipoDocumento;

  // index normal (no de texto): soporta el sort estable de la paginación.
  // La búsqueda usa regex "contiene" para conservar la MISMA semántica
  // que el adaptador CSV (un índice de texto matchea por palabra y
  // devolvería resultados distintos al hacer el swap).
  @Prop({ required: true, index: true })
  razonSocial: string;

  @Prop({ type: String, enum: EstadoProveedor, required: true })
  estado: EstadoProveedor;

  @Prop({ required: true })
  pais: string;

  @Prop({ type: DireccionFiscalSchema })
  direccionFiscal?: DireccionFiscalSchema;

  @Prop({ required: true })
  urlOrigen: string;

  @Prop({ required: true, default: () => new Date() })
  fechaIngesta: Date;
}

export const ProveedorSchema = SchemaFactory.createForClass(Proveedor);
