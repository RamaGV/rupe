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

  // Números generales para el dashboard. Mismo patrón $facet que el
  // perfil de empresa: todas las vistas del resumen en UNA pasada.
  //
  // anio acota TODO el resumen a ese año (sin anio = histórico completo).
  // OJO dato conocido: el año corriente no tiene adjudicaciones hasta que
  // salga su dump OCDS (enero siguiente) — montosPorMoneda vacío para el
  // año actual es correcto, no un bug.
  async estadisticasGenerales(anio?: number) {
    const ahora = new Date();
    const [r] = await this.licitacionModel.aggregate([
      // $match ANTES del $facet: todas las facetas heredan el recorte
      ...(anio ? [{ $match: { anio } }] : []),
      {
        $facet: {
          total: [{ $count: 'n' }],
          // misma derivación que buscar(): vigente = se puede ofertar HOY
          vigentes: [
            {
              $match: {
                estado: 'vigente',
                $or: [
                  { fechaRecepcionOfertas: { $gte: ahora } },
                  { fechaRecepcionOfertas: null },
                ],
              },
            },
            { $count: 'n' },
          ],
          // total adjudicado POR MONEDA sobre todo lo cargado (regla 4:
          // jamás sumar monedas distintas en un solo número)
          montosPorMoneda: [
            { $match: { 'adjudicacion.montoTotal': { $gt: 0 } } },
            {
              $group: {
                _id: { $ifNull: ['$adjudicacion.moneda', 'sin moneda'] },
                total: { $sum: '$adjudicacion.montoTotal' },
                cantidad: { $sum: 1 },
              },
            },
            { $sort: { total: -1 } },
            { $project: { _id: 0, moneda: '$_id', total: 1, cantidad: 1 } },
          ],
          topOrganismos: [
            { $match: { 'organismo.nombreInciso': { $nin: ['', null] } } },
            {
              $group: {
                _id: { inciso: '$organismo.inciso', nombre: '$organismo.nombreInciso' },
                cantidad: { $sum: 1 },
              },
            },
            { $sort: { cantidad: -1 } },
            { $limit: 5 },
            { $project: { _id: 0, inciso: '$_id.inciso', nombre: '$_id.nombre', cantidad: 1 } },
          ],
          // Distribución por tipo de contratación (dona del dashboard)
          porTipo: [
            { $group: { _id: '$tipo', cantidad: { $sum: 1 } } },
            { $sort: { cantidad: -1 } },
            { $limit: 8 },
            { $project: { _id: 0, tipo: '$_id', cantidad: 1 } },
          ],
          // Ranking de proveedores por monto ganado — en UYU etiquetado
          // (regla 4: un ranking "total" mezclando monedas sería mentira)
          topProveedores: [
            {
              $match: {
                'adjudicacion.moneda': 'Pesos Uruguayos',
                'adjudicacion.montoTotal': { $gt: 0 },
              },
            },
            {
              $group: {
                _id: '$adjudicacion.proveedor.numeroDocumento',
                razonSocial: { $first: '$adjudicacion.proveedor.razonSocial' },
                totalUYU: { $sum: '$adjudicacion.montoTotal' },
                adjudicaciones: { $sum: 1 },
              },
            },
            { $match: { _id: { $ne: null } } },
            { $sort: { totalUYU: -1 } },
            { $limit: 5 },
            { $project: { _id: 0, numeroDocumento: '$_id', razonSocial: 1, totalUYU: 1, adjudicaciones: 1 } },
          ],
          // Actividad por mes para el gráfico del dashboard: cantidad de
          // llamados publicados + monto adjudicado en UYU (UNA moneda,
          // etiquetada — regla 4: jamás sumar monedas distintas).
          // Últimos 24 meses del recorte (desc + limit + reverse en JS).
          evolucionMensual: [
            {
              $group: {
                _id: { $dateToString: { format: '%Y-%m', date: '$fechaPublicacion' } },
                llamados: { $sum: 1 },
                montoUYU: {
                  $sum: {
                    $cond: [
                      { $eq: ['$adjudicacion.moneda', 'Pesos Uruguayos'] },
                      { $ifNull: ['$adjudicacion.montoTotal', 0] },
                      0,
                    ],
                  },
                },
              },
            },
            { $sort: { _id: -1 } },
            { $limit: 24 },
            { $project: { _id: 0, mes: '$_id', llamados: 1, montoUYU: 1 } },
          ],
          ultimasAdjudicaciones: [
            { $match: { 'adjudicacion.fechaAdjudicacion': { $ne: null } } },
            { $sort: { 'adjudicacion.fechaAdjudicacion': -1 } },
            { $limit: 5 },
            {
              $project: {
                _id: 0,
                licitacionId: '$id',
                descripcion: 1,
                organismo: '$organismo.nombreInciso',
                proveedor: '$adjudicacion.proveedor.razonSocial',
                montoTotal: '$adjudicacion.montoTotal',
                moneda: '$adjudicacion.moneda',
                fechaAdjudicacion: '$adjudicacion.fechaAdjudicacion',
              },
            },
          ],
        },
      },
    ]);

    return {
      anio: anio ?? null, // eco del recorte pedido (null = histórico)
      totalLicitaciones: r.total[0]?.n ?? 0,
      vigentes: r.vigentes[0]?.n ?? 0,
      montosPorMoneda: r.montosPorMoneda,
      topOrganismos: r.topOrganismos,
      porTipo: r.porTipo,
      topProveedores: r.topProveedores,
      evolucionMensual: [...r.evolucionMensual].reverse(), // cronológico
      ultimasAdjudicaciones: r.ultimasAdjudicaciones,
    };
  }

  // Licitaciones similares para el detalle: mismo organismo y tipo,
  // las más recientes primero. Heurística simple y honesta — suficiente
  // para "mirá qué más compra así este organismo" (comparar precios).
  async similares(id: string) {
    const base = await this.licitacionModel
      .findOne({ id }, { 'organismo.inciso': 1, tipo: 1 })
      .lean();
    if (!base) return [];

    return this.licitacionModel
      .find(
        {
          id: { $ne: id },
          'organismo.inciso': base.organismo.inciso,
          tipo: base.tipo,
        },
        { _id: 0, id: 1, numeroCompra: 1, descripcion: 1, estado: 1, fechaPublicacion: 1, 'adjudicacion.montoTotal': 1, 'adjudicacion.moneda': 1 },
      )
      .sort({ fechaPublicacion: -1 })
      .limit(5)
      .lean();
  }

  // Export CSV ("modo periodista"): la MISMA busqueda que la lista,
  // pero hasta 1000 filas y en el dialecto de Excel uruguayo — separador
  // ';' y BOM UTF-8 (el mismo formato de los CSV oficiales de RUPE).
  async exportarCsv(filtros: BuscarLicitacionesDto): Promise<string> {
    // el DTO ya valido el input del usuario; el tope interno es nuestro
    const { datos } = await this.buscar({ ...filtros, page: 1, limit: 1000 });

    const celda = (v: unknown): string => {
      if (v === undefined || v === null) return '';
      const s = v instanceof Date ? v.toISOString() : String(v);
      return `"${s.replace(/"/g, '""')}"`;
    };

    const filas = datos.map((l: any) =>
      [
        l.id, l.numeroCompra, l.anio, l.tipo, l.estado,
        l.organismo?.nombreInciso, l.organismo?.unidadEjecutora,
        l.descripcion, l.fechaPublicacion, l.fechaRecepcionOfertas,
        l.adjudicacion?.proveedor?.razonSocial,
        l.adjudicacion?.montoTotal, l.adjudicacion?.moneda, l.urlOrigen,
      ].map(celda).join(';'),
    );

    const cabecera = [
      'id', 'numeroCompra', 'anio', 'tipo', 'estado', 'organismo',
      'unidadEjecutora', 'descripcion', 'fechaPublicacion',
      'fechaRecepcionOfertas', 'proveedor', 'montoTotal', 'moneda', 'url',
    ].join(';');

    return '﻿' + [cabecera, ...filas].join('\r\n');
  }

  // RADAR DE PRECIOS: ¿a cuánto se le vendió ESTE artículo al Estado?
  // Busca por texto en las descripciones de items (el usuario no conoce
  // los códigos de artículo de ARCE) y devuelve el resumen POR MONEDA
  // (regla 4) + las últimas muestras reales, navegables.
  async radarPrecios(texto: string) {
    // input escapado: "lápiz 2.5" busca el punto literal
    const regex = new RegExp(texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

    const [r] = await this.licitacionModel.aggregate([
      // prefiltro barato ANTES del $unwind: solo docs con algún item
      // que matchee — el unwind de 322k items se paga solo una vez acá
      { $match: { items: { $elemMatch: { descripcion: regex, precioUnitario: { $gt: 0 } } } } },
      { $unwind: '$items' },
      { $match: { 'items.descripcion': regex, 'items.precioUnitario': { $gt: 0 } } },
      {
        $facet: {
          resumenPorMoneda: [
            {
              $group: {
                _id: { $ifNull: ['$items.moneda', 'sin moneda'] },
                minimo: { $min: '$items.precioUnitario' },
                promedio: { $avg: '$items.precioUnitario' },
                maximo: { $max: '$items.precioUnitario' },
                muestras: { $sum: 1 },
              },
            },
            { $sort: { muestras: -1 } },
            {
              $project: {
                _id: 0, moneda: '$_id', minimo: 1, maximo: 1, muestras: 1,
                promedio: { $round: ['$promedio', 2] },
              },
            },
          ],
          muestras: [
            { $sort: { 'adjudicacion.fechaAdjudicacion': -1 } },
            { $limit: 50 },
            {
              $project: {
                _id: 0,
                licitacionId: '$id',
                fecha: { $ifNull: ['$adjudicacion.fechaAdjudicacion', '$fechaPublicacion'] },
                organismo: '$organismo.nombreInciso',
                inciso: '$organismo.inciso',
                proveedor: '$adjudicacion.proveedor.razonSocial',
                numeroDocumento: '$adjudicacion.proveedor.numeroDocumento',
                item: '$items.descripcion',
                cantidad: '$items.cantidad',
                unidad: '$items.unidad',
                precioUnitario: '$items.precioUnitario',
                moneda: '$items.moneda',
              },
            },
          ],
        },
      },
    ]);

    return { texto, resumenPorMoneda: r.resumenPorMoneda, muestras: r.muestras };
  }

  // El espejo del perfil de empresa: ¿cómo compra ESTE organismo?
  // Mismo patrón $facet tras un $match por inciso.
  async perfilOrganismo(inciso: number) {
    const ahora = new Date();
    const [r] = await this.licitacionModel.aggregate([
      { $match: { 'organismo.inciso': inciso } },
      {
        $facet: {
          totales: [
            {
              $group: {
                _id: null,
                llamados: { $sum: 1 },
                nombre: { $last: '$organismo.nombreInciso' },
                desde: { $min: '$fechaPublicacion' },
              },
            },
          ],
          vigentes: [
            {
              $match: {
                estado: 'vigente',
                $or: [
                  { fechaRecepcionOfertas: { $gte: ahora } },
                  { fechaRecepcionOfertas: null },
                ],
              },
            },
            { $count: 'n' },
          ],
          montosPorMoneda: [
            { $match: { 'adjudicacion.montoTotal': { $gt: 0 } } },
            {
              $group: {
                _id: { $ifNull: ['$adjudicacion.moneda', 'sin moneda'] },
                total: { $sum: '$adjudicacion.montoTotal' },
                cantidad: { $sum: 1 },
              },
            },
            { $sort: { total: -1 } },
            { $project: { _id: 0, moneda: '$_id', total: 1, cantidad: 1 } },
          ],
          // a quién le compra (ranking UYU etiquetado — regla 4)
          topProveedores: [
            {
              $match: {
                'adjudicacion.moneda': 'Pesos Uruguayos',
                'adjudicacion.montoTotal': { $gt: 0 },
              },
            },
            {
              $group: {
                _id: '$adjudicacion.proveedor.numeroDocumento',
                razonSocial: { $first: '$adjudicacion.proveedor.razonSocial' },
                totalUYU: { $sum: '$adjudicacion.montoTotal' },
                adjudicaciones: { $sum: 1 },
              },
            },
            { $match: { _id: { $ne: null } } },
            { $sort: { totalUYU: -1 } },
            { $limit: 5 },
            { $project: { _id: 0, numeroDocumento: '$_id', razonSocial: 1, totalUYU: 1, adjudicaciones: 1 } },
          ],
          porTipo: [
            { $group: { _id: '$tipo', cantidad: { $sum: 1 } } },
            { $sort: { cantidad: -1 } },
            { $limit: 5 },
            { $project: { _id: 0, tipo: '$_id', cantidad: 1 } },
          ],
          ultimasAdjudicaciones: [
            { $match: { 'adjudicacion.fechaAdjudicacion': { $ne: null } } },
            { $sort: { 'adjudicacion.fechaAdjudicacion': -1 } },
            { $limit: 5 },
            {
              $project: {
                _id: 0,
                licitacionId: '$id',
                descripcion: 1,
                proveedor: '$adjudicacion.proveedor.razonSocial',
                montoTotal: '$adjudicacion.montoTotal',
                moneda: '$adjudicacion.moneda',
                fechaAdjudicacion: '$adjudicacion.fechaAdjudicacion',
              },
            },
          ],
        },
      },
    ]);

    return {
      inciso,
      nombre: r.totales[0]?.nombre ?? '',
      totalLlamados: r.totales[0]?.llamados ?? 0,
      registradoDesde: r.totales[0]?.desde,
      vigentes: r.vigentes[0]?.n ?? 0,
      montosPorMoneda: r.montosPorMoneda,
      topProveedores: r.topProveedores,
      porTipo: r.porTipo,
      ultimasAdjudicaciones: r.ultimasAdjudicaciones,
    };
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