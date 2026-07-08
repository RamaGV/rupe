// backend/src/alertas/alertas-matcher.service.ts
//
// El MOTOR: recibe los llamados que la ingesta detectó como NUEVOS y
// genera notificaciones para las alertas activas que matcheen.
//
// La decisión de matcheo vive en matcher/alerta-matcher.ts (función pura
// testeada); acá solo se orquesta: cargar alertas, cruzar, persistir,
// loguear (el "canal log" de la v1 — email será otro canal más adelante).
import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Alerta, AlertaDocument } from './schemas/alerta.schema';
import { Notificacion, NotificacionDocument } from './schemas/notificacion.schema';
import { matcheaCriterios } from './matcher/alerta-matcher';
import type { LlamadoMatcheable } from './matcher/alerta-matcher';
import { TipoAlerta } from '../shared/types';
import { PushService } from '../push/push.service';

// Lo que el motor necesita del llamado nuevo, además de lo matcheable:
// identidad y datos para el snapshot de la notificación.
export type LlamadoNuevo = LlamadoMatcheable & {
  id?: string;
  fechaRecepcionOfertas?: Date;
};

@Injectable()
export class AlertasMatcherService {
  private readonly logger = new Logger(AlertasMatcherService.name);

  constructor(
    @InjectModel(Alerta.name)
    private readonly alertaModel: Model<AlertaDocument>,
    @InjectModel(Notificacion.name)
    private readonly notificacionModel: Model<NotificacionDocument>,
    private readonly pushService: PushService,
  ) {}

  // Los dos motores comparten el núcleo: cambia QUÉ alertas cargan
  // (tipo) y el snapshot que queda en la notificación. El dedupe por
  // índice único alertaId+licitacionId también sirve al vencimiento:
  // el cron diario re-encuentra el mismo llamado dentro de la ventana
  // y el duplicado se descarta solo.

  async procesarNuevosLlamados(nuevos: LlamadoNuevo[]): Promise<number> {
    return this.procesar(nuevos, TipoAlerta.NUEVO_LLAMADO, '🔔');
  }

  async procesarVencimientos(porVencer: LlamadoNuevo[]): Promise<number> {
    return this.procesar(porVencer, TipoAlerta.VENCIMIENTO, '⏰');
  }

  private async procesar(
    llamados: LlamadoNuevo[],
    tipo: TipoAlerta,
    icono: string,
  ): Promise<number> {
    if (llamados.length === 0) return 0;

    const alertas = await this.alertaModel.find({ activa: true, tipo }).lean();
    if (alertas.length === 0) return 0;

    const notificaciones: Notificacion[] = [];
    for (const llamado of llamados) {
      for (const alerta of alertas) {
        if (!matcheaCriterios(llamado, alerta.criterios)) continue;

        notificaciones.push({
          alertaId: String(alerta._id),
          alertaNombre: alerta.nombre,
          tipoAlerta: tipo,
          licitacionId: llamado.id ?? '',
          descripcion: llamado.descripcion ?? '',
          organismo: llamado.organismo?.nombreInciso ?? '',
          tipoContratacion: llamado.tipo ?? '',
          fechaRecepcionOfertas: llamado.fechaRecepcionOfertas,
          leida: false,
        });
        // canal log de la v1: visible en la consola del backend
        this.logger.log(
          `${icono} Alerta "${alerta.nombre}" matcheó el llamado ${llamado.id}: ${llamado.descripcion}`,
        );
      }
    }

    // ordered:false → si una notificación choca con el índice único
    // (alertaId+licitacionId ya notificado), se descarta ESA y las
    // demás se insertan igual. El duplicado no es un error del motor.
    // Se devuelve lo INSERTADO, no lo matcheado: en una re-corrida
    // (cron diario de vencimientos, debug repetido) los duplicados
    // no cuentan como notificaciones nuevas.
    let insertadas = notificaciones.length;
    if (notificaciones.length > 0) {
      await this.notificacionModel
        .insertMany(notificaciones, { ordered: false })
        .catch((err) => {
          if (err?.code !== 11000) throw err;
          insertadas = err.insertedDocs?.length ?? 0;
        });
    }
    // canal push: mejor esfuerzo — la notificación YA está persistida
    if (insertadas > 0) {
      const titulo = icono + ' ' + insertadas + (insertadas === 1 ? ' aviso nuevo' : ' avisos nuevos');
      const cuerpo = notificaciones[0].descripcion || 'Ver el boletín';
      this.pushService
        .notificarTodos(titulo, cuerpo, '/notificaciones')
        .catch((err) => this.logger.warn(`Canal push falló: ${err?.message}`));
    }
    return insertadas;
  }
}
