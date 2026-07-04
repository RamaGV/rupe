// src/licitaciones/licitaciones.service.ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Licitacion, LicitacionDocument } from './schemas/licitacion.schema';
import { OrdenLicitaciones } from './dto/buscar-licitaciones.dto';
import type { BuscarLicitacionesDto } from './dto/buscar-licitaciones.dto';
import { EstadoLlamado } from '../shared/types/enums';

// Cada orden del DTO mapea a un sort de Mongo. Tabla de datos > switch:
// agregar un orden nuevo es una línea, no una rama más.
const ORDENES: Record<OrdenLicitaciones, Record<string, 1 | -1>> = {
  [OrdenLicitaciones.RECIENTES]: { fechaPublicacion: -1 },
  [OrdenLicitaciones.CIERRE]: { fechaRecepcionOfertas: 1 },
  [OrdenLicitaciones.MONTO]: { 'adjudicacion.montoTotal': -1 },
};

// Campos internos que NO son parte del contrato de la API: metadatos de
// Mongo (_id, __v), telemetría de ingesta y los timestamps del schema.
// Se excluyen como PROYECCIÓN (Mongo ni siquiera los envía) en vez de
// con class-transformer, que necesita instancias de clase y acá usamos
// .lean() justamente para no pagar la hidratación de documentos.
const PROYECCION_PUBLICA = {
  _id: 0,
  __v: 0,
  fechaIngesta: 0,
  createdAt: 0,
  updatedAt: 0,
} as const;

@Injectable()
export class LicitacionesService {
  constructor(
    @InjectModel(Licitacion.name)
    private readonly licitacionModel: Model<LicitacionDocument>,
  ) {}

  async buscar(filtros: BuscarLicitacionesDto) {
    const { tipo, estado, anio, inciso, texto, page, limit, orden } = filtros;

    // Armamos el filtro de Mongo incrementalmente - solo agregamos
    // condiciones para los parámetros que realmente vinieron en la query.
    const query: Record<string, any> = {};
    if (tipo) query.tipo = tipo;
    if (estado) query.estado = estado;
    // "vigente" para la API significa "SE PUEDE OFERTAR HOY". En la base,
    // estado guarda lo que la fuente dijo — y un tender OCDS queda
    // 'active' en su último release aunque haya cerrado hace meses
    // (~6.9k docs así en el dump 2025; nadie publica el "cerró").
    // Derivamos: vigente = estado vigente Y (cierre futuro O desconocido).
    if (estado === EstadoLlamado.VIGENTE) {
      query.$or = [
        { fechaRecepcionOfertas: { $gte: new Date() } },
        { fechaRecepcionOfertas: null }, // en Mongo, null matchea también al campo ausente
      ];
    }
    if (anio) query.anio = anio;
    if (inciso) query['organismo.inciso'] = inciso;
    if (texto) query.$text = { $search: texto };

    const skip = (page - 1) * limit;

    const [datos, total] = await Promise.all([
      this.licitacionModel
        .find(query, PROYECCION_PUBLICA)
        .sort(ORDENES[orden])
        .skip(skip)
        .limit(limit)
        .lean(), // .lean() devuelve objetos JS planos, no documentos
                 // de Mongoose - más rápido cuando solo vas a leer.
      this.licitacionModel.countDocuments(query),
    ]);

    return {
      datos,
      total,
      page,
      totalPaginas: Math.ceil(total / limit),
    };
  }

  async buscarPorId(id: string) {
    return this.licitacionModel.findOne({ id }, PROYECCION_PUBLICA).lean();
  }

  // Resumen de adjudicaciones ganadas por un proveedor (para PerfilEmpresa).
  //
  // Usamos un aggregation pipeline con $facet: después del $match inicial
  // (que usa el índice sparse por numeroDocumento), Mongo calcula las
  // CUATRO vistas del resumen en una sola pasada sobre esos documentos —
  // en vez de hacer 4 queries que repitan el mismo filtro.
  async resumenAdjudicacionesPorProveedor(numeroDocumento: string) {
    const [resultado] = await this.licitacionModel.aggregate([
      { $match: { 'adjudicacion.proveedor.numeroDocumento': numeroDocumento } },
      {
        $facet: {
          // total ganado agrupado por moneda (sumar monedas distintas
          // en un solo número sería inventar una conversión)
          montosPorMoneda: [
            {
              $group: {
                _id: { $ifNull: ['$adjudicacion.moneda', 'sin moneda'] },
                total: { $sum: { $ifNull: ['$adjudicacion.montoTotal', 0] } },
                cantidad: { $sum: 1 },
              },
            },
            { $sort: { total: -1 } },
            { $project: { _id: 0, moneda: '$_id', total: 1, cantidad: 1 } },
          ],
          organismos: [
            { $group: { _id: '$organismo.nombreInciso', cantidad: { $sum: 1 } } },
            { $sort: { cantidad: -1 } },
            { $limit: 5 },
          ],
          ultimas: [
            { $sort: { 'adjudicacion.fechaAdjudicacion': -1 } },
            { $limit: 10 },
            {
              $project: {
                _id: 0,
                licitacionId: '$id',
                numeroCompra: 1,
                descripcion: 1,
                organismo: '$organismo.nombreInciso',
                montoTotal: '$adjudicacion.montoTotal',
                moneda: '$adjudicacion.moneda',
                fechaAdjudicacion: '$adjudicacion.fechaAdjudicacion',
                // para reconstruir la identidad si el proveedor no está en RUPE
                razonSocial: '$adjudicacion.proveedor.razonSocial',
              },
            },
          ],
          actividad: [
            {
              $group: {
                _id: null,
                total: { $sum: 1 },
                ultima: { $max: '$adjudicacion.fechaAdjudicacion' },
              },
            },
          ],
        },
      },
    ]);

    return {
      totalLicitacionesGanadas: resultado.actividad[0]?.total ?? 0,
      montosPorMoneda: resultado.montosPorMoneda,
      organismosMasFrecuentes: resultado.organismos.map(
        (o: { _id: string }) => o._id,
      ),
      ultimaActividad: resultado.actividad[0]?.ultima,
      ultimasAdjudicaciones: resultado.ultimas,
    };
  }
}