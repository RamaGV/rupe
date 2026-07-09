// backend/src/estadisticas/cache-calculos.service.ts
//
// Los cálculos del dashboard/banderas recorren ~600k documentos. La
// estrategia (idea del autor): calcular y GUARDAR.
//   1. memoria (TTL 10 min) — el caso común, instantáneo
//   2. Mongo (colección `calculos`) — sobrevive reinicios: al arrancar
//      se sirve lo último calculado YA, y si venció se refresca de fondo
//   3. recalcular — solo cuando no hay nada o venció
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { LicitacionesService } from '../licitaciones/licitaciones.service';

const TTL_MS = 10 * 60 * 1000;

@Schema({ collection: 'calculos' })
export class Calculo {
  @Prop({ required: true, unique: true }) clave: string;
  @Prop({ type: Object, required: true }) data: unknown;
  @Prop({ required: true }) calculadoEn: Date;
}
export const CalculoSchema = SchemaFactory.createForClass(Calculo);

@Injectable()
export class CacheCalculosService implements OnModuleInit {
  private readonly logger = new Logger(CacheCalculosService.name);
  private memoria = new Map<string, { data: unknown; exp: number }>();

  constructor(
    private readonly licitacionesService: LicitacionesService,
    @InjectModel(Calculo.name) private readonly calculoModel: Model<Calculo>,
  ) {}

  onModuleInit(): void {
    // precarga de las claves calientes, en segundo plano (no bloquea el boot)
    const anio = new Date().getFullYear();
    void this.obtener(`estadisticas:${anio}`, () =>
      this.licitacionesService.estadisticasGenerales(anio),
    );
    void this.obtener('estadisticas:todo', () =>
      this.licitacionesService.estadisticasGenerales(),
    ).then(() => this.logger.log('Cálculos calientes listos (memoria + Mongo)'));
    void this.obtener('banderas', () => this.licitacionesService.banderasRojas());
  }

  async obtener<T>(clave: string, calcular: () => Promise<T>): Promise<T> {
    const hit = this.memoria.get(clave);
    if (hit && hit.exp > Date.now()) return hit.data as T;

    // ¿hay uno persistido? Se sirve AUNQUE esté vencido (stale-while-
    // revalidate: mejor un dato de hace 20 min ya que uno de hace 8 s
    // que costó 8 s) y si venció se recalcula de fondo.
    const guardado = await this.calculoModel.findOne({ clave }).lean();
    if (guardado) {
      const fresco = guardado.calculadoEn.getTime() + TTL_MS > Date.now();
      this.memoria.set(clave, {
        data: guardado.data,
        exp: guardado.calculadoEn.getTime() + TTL_MS,
      });
      if (!fresco) void this.recalcular(clave, calcular);
      return guardado.data as T;
    }

    return this.recalcular(clave, calcular);
  }

  private async recalcular<T>(clave: string, calcular: () => Promise<T>): Promise<T> {
    const data = await calcular();
    this.memoria.set(clave, { data, exp: Date.now() + TTL_MS });
    await this.calculoModel.findOneAndUpdate(
      { clave },
      { clave, data, calculadoEn: new Date() },
      { upsert: true },
    );
    return data;
  }
}
