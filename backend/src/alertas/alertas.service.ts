// backend/src/alertas/alertas.service.ts
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Alerta, AlertaDocument } from './schemas/alerta.schema';
import { CrearAlertaDto, ActualizarAlertaDto, CriteriosAlertaDto } from './dto/crear-alerta.dto';
import { TipoAlerta } from '../shared/types';

@Injectable()
export class AlertasService {
  constructor(
    @InjectModel(Alerta.name)
    private readonly alertaModel: Model<AlertaDocument>,
  ) {}

  async crear(dto: CrearAlertaDto) {
    this.validarCriterios(dto.criterios);

    const creada = await this.alertaModel.create({
      nombre: dto.nombre,
      tipo: dto.tipo ?? TipoAlerta.NUEVO_LLAMADO,
      criterios: dto.criterios,
      activa: true,
    });
    return this.aRespuesta(creada.toObject());
  }

  async listar() {
    const alertas = await this.alertaModel.find().sort({ createdAt: -1 }).lean();
    return alertas.map((a) => this.aRespuesta(a));
  }

  async actualizar(id: string, dto: ActualizarAlertaDto) {
    if (dto.criterios) this.validarCriterios(dto.criterios);

    const actualizada = await this.alertaModel
      .findByIdAndUpdate(id, { $set: dto }, { returnDocument: 'after' })
      .lean();
    if (!actualizada) {
      throw new NotFoundException(`No existe la alerta "${id}"`);
    }
    return this.aRespuesta(actualizada);
  }

  async eliminar(id: string): Promise<void> {
    const borrada = await this.alertaModel.findByIdAndDelete(id).lean();
    if (!borrada) {
      throw new NotFoundException(`No existe la alerta "${id}"`);
    }
  }

  // Una alerta sin ningún criterio sería "avisame de TODO" por accidente
  // (además el matcher la ignora: defensa en profundidad).
  private validarCriterios(criterios: CriteriosAlertaDto): void {
    const tieneAlguno =
      !!criterios.palabrasClave?.length ||
      !!criterios.incisos?.length ||
      !!criterios.tiposContratacion?.length;
    if (!tieneAlguno) {
      throw new BadRequestException(
        'La alerta necesita al menos un criterio (palabrasClave, incisos o tiposContratacion)',
      );
    }
  }

  // La API expone "id" (string), no el _id de Mongo con su ObjectId —
  // mismo contrato que el resto del dominio (shared/types Alerta.id).
  private aRespuesta(alerta: Record<string, any>) {
    const { _id, __v, createdAt, updatedAt, ...resto } = alerta;
    return { id: String(_id), creadaEn: createdAt, ...resto };
  }
}
