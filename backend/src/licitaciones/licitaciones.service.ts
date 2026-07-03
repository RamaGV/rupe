// src/licitaciones/licitaciones.service.ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Licitacion, LicitacionDocument } from './schemas/licitacion.schema';

export interface FiltrosLicitacion {
  tipo?: string;
  inciso?: number;
  texto?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class LicitacionesService {
  constructor(
    @InjectModel(Licitacion.name)
    private readonly licitacionModel: Model<LicitacionDocument>,
  ) {}

  async buscar(filtros: FiltrosLicitacion) {
    const { tipo, inciso, texto, page = 1, limit = 20 } = filtros;

    // Armamos el filtro de Mongo incrementalmente - solo agregamos
    // condiciones para los parámetros que realmente vinieron en la query.
    const query: Record<string, any> = {};
    if (tipo) query.tipo = tipo;
    if (inciso) query['organismo.inciso'] = inciso;
    if (texto) query.$text = { $search: texto };

    const skip = (page - 1) * limit;

    const [datos, total] = await Promise.all([
      this.licitacionModel
        .find(query)
        .sort({ fechaRecepcionOfertas: 1 })
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
    return this.licitacionModel.findOne({ id }).lean();
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