// src/licitaciones/vencimientos-scheduler.service.ts
//
// Alertas de VENCIMIENTO: a diferencia de NUEVO_LLAMADO (evento de
// ingesta), esto es un evento de RELOJ — "de lo que te interesa, ¿qué
// cierra pronto?". Vive en licitaciones/ y no en alertas/ a propósito:
// este módulo es el que sabe consultar la colección; el motor de
// alertas RECIBE los llamados por vencer, nunca los busca (decisión 10).
//
// No re-notifica: el cron diario re-encuentra los mismos llamados
// dentro de la ventana, pero el índice único alertaId+licitacionId de
// notificaciones descarta los duplicados. Caso conocido: si un llamado
// se PRORROGA después de notificado, la nueva fecha no re-notifica
// (mismo par alerta+llamado) — aceptado y documentado.
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Licitacion, LicitacionDocument } from './schemas/licitacion.schema';
import { AlertasMatcherService } from '../alertas/alertas-matcher.service';
import type { LlamadoNuevo } from '../alertas/alertas-matcher.service';
import { EstadoLlamado } from '../shared/types/enums';

// Ventana fija de aviso. Si algún día se quiere por-alerta ("avisame 7
// días antes"), es un campo en el schema de Alerta + filtrar acá.
const VENTANA_HORAS = 48;

@Injectable()
export class VencimientosSchedulerService implements OnModuleInit {
  private readonly logger = new Logger(VencimientosSchedulerService.name);

  constructor(
    @InjectModel(Licitacion.name)
    private readonly licitacionModel: Model<LicitacionDocument>,
    private readonly alertasMatcher: AlertasMatcherService,
  ) {}

  // Mismo motivo que la ingesta inicial del RSS: en desarrollo el
  // backend no suele estar vivo a las 8:00 — revisamos al arrancar
  // (el dedupe hace que arrancar 5 veces no notifique 5 veces).
  async onModuleInit() {
    try {
      await this.revisarVencimientos();
    } catch (err) {
      // que una revisión fallida no impida levantar la app
      this.logger.error(`Revisión inicial de vencimientos falló: ${err.message}`);
    }
  }

  // Todos los días a las 08:00 (hora del servidor). Diario alcanza:
  // con ventana de 48h, cada llamado cae en 2 revisiones — la primera
  // notifica, la segunda se descarta por el índice único.
  @Cron('0 0 8 * * *')
  async revisionDiaria() {
    this.logger.log('Revisión diaria de vencimientos...');
    await this.revisarVencimientos();
  }

  async revisarVencimientos(): Promise<{ porVencer: number; notificaciones: number }> {
    const ahora = new Date();
    const limite = new Date(ahora.getTime() + VENTANA_HORAS * 3_600_000);

    // Solo vigentes con cierre DENTRO de la ventana: lo ya vencido no
    // se avisa (llegó tarde), lo lejano todavía no toca.
    const porVencer = await this.licitacionModel
      .find({
        estado: EstadoLlamado.VIGENTE,
        fechaRecepcionOfertas: { $gte: ahora, $lte: limite },
      })
      .lean<LlamadoNuevo[]>();

    const notificaciones = await this.alertasMatcher.procesarVencimientos(porVencer);
    this.logger.log(
      `Vencimientos: ${porVencer.length} llamados cierran en <${VENTANA_HORAS}h, ` +
        `${notificaciones} notificaciones`,
    );
    return { porVencer: porVencer.length, notificaciones };
  }
}
