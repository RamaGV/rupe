// backend/src/ingesta/repositories/proveedores-mongo.repository.ts
//
// Adaptador Mongo del contrato ProveedoresRepository. El swap desde el
// CSV es SOLO cambiar useClass en ingesta.module.ts: mismo contrato,
// misma semántica de búsqueda ("contiene", case-insensitive), otra
// infraestructura — la promesa del patrón Repository, cumplida.
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ProveedoresRepository } from './proveedores-repository.interface';
import type { FiltrosProveedor, PaginaProveedores } from './proveedores-repository.interface';
import { ProveedorRupe } from '../../shared/types';
import { Proveedor, ProveedorDocument } from '../schemas/proveedor.schema';

// El repositorio habla el idioma del dominio: los metadatos de Mongo
// (_id, __v, createdAt/updatedAt de timestamps) no salen de acá.
const PROYECCION_DOMINIO = { _id: 0, __v: 0, createdAt: 0, updatedAt: 0 } as const;

@Injectable()
export class ProveedoresMongoRepository implements ProveedoresRepository {
  constructor(
    @InjectModel(Proveedor.name)
    private readonly proveedorModel: Model<ProveedorDocument>,
  ) {}

  async buscar(filtros: FiltrosProveedor): Promise<PaginaProveedores> {
    const { page = 1, limit = 20, texto } = filtros;

    // (mismo estilo que licitaciones.service: el filtro se arma incremental)
    const query: Record<string, any> = {};
    const termino = texto?.trim();
    if (termino) {
      // Semántica "contiene" idéntica al adaptador CSV. El input del
      // usuario se escapa: "S.A." debe buscar el punto literal, no
      // "S<cualquier cosa>A" (y un regex malicioso no debe llegar a Mongo).
      const regex = new RegExp(escaparRegex(termino), 'i');
      query.$or = [{ razonSocial: regex }, { numeroDocumento: regex }];
    }

    const skip = (page - 1) * limit;
    const [datos, total] = await Promise.all([
      this.proveedorModel
        .find(query, PROYECCION_DOMINIO)
        // Orden estable para que la paginación no repita ni saltee
        // proveedores entre páginas (el CSV tenía el orden del archivo;
        // en Mongo el orden "natural" no está garantizado).
        .sort({ razonSocial: 1, numeroDocumento: 1 })
        .skip(skip)
        .limit(limit)
        .lean<ProveedorRupe[]>(),
      this.proveedorModel.countDocuments(query),
    ]);

    return { datos, total, page, totalPaginas: Math.ceil(total / limit) };
  }

  async findByDocumento(numeroDocumento: string): Promise<ProveedorRupe | null> {
    return this.proveedorModel
      .findOne({ numeroDocumento }, PROYECCION_DOMINIO)
      .lean<ProveedorRupe>();
  }
}

function escaparRegex(texto: string): string {
  return texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
