// backend/src/alertas/notificaciones.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Notificacion, NotificacionDocument } from './schemas/notificacion.schema';

@Injectable()
export class NotificacionesService {
  constructor(
    @InjectModel(Notificacion.name)
    private readonly notificacionModel: Model<NotificacionDocument>,
  ) {}

  // Las últimas 50: una bandeja, no un historial paginado (si algún día
  // hace falta paginar, es el mismo patrón del DTO de licitaciones).
  async listar(soloNoLeidas: boolean) {
    const filtro = soloNoLeidas ? { leida: false } : {};
    const [notificaciones, sinLeer] = await Promise.all([
      this.notificacionModel
        .find(filtro)
        .sort({ createdAt: -1 })
        .limit(50)
        // los timestamps (createdAt/updatedAt) los agrega el schema en
        // runtime pero no existen en la clase: el lean tipado los admite
        .lean<Record<string, any>[]>(),
      this.notificacionModel.countDocuments({ leida: false }),
    ]);

    return {
      sinLeer,
      datos: notificaciones.map(({ _id, __v, createdAt, updatedAt, ...resto }) => ({
        id: String(_id),
        creadaEn: createdAt,
        ...resto,
      })),
    };
  }

  async marcarLeida(id: string): Promise<void> {
    const actualizada = await this.notificacionModel
      .findByIdAndUpdate(id, { $set: { leida: true } })
      .lean();
    if (!actualizada) {
      throw new NotFoundException(`No existe la notificación "${id}"`);
    }
  }
}
