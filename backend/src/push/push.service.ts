// backend/src/push/push.service.ts
//
// Canal de notificaciones push del navegador: la alternativa al email
// que no necesita dominio ni proveedor. web-push manda el mensaje al
// push service del navegador del usuario (Google/Mozilla/Apple lo
// entregan gratis), firmado con nuestras claves VAPID.
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as webpush from 'web-push';
import {
  PushSuscripcion,
  PushSuscripcionDocument,
  ConfigVapid,
  ConfigVapidDocument,
} from './push.schemas';

@Injectable()
export class PushService implements OnModuleInit {
  private readonly logger = new Logger(PushService.name);
  private clavePublica = '';

  constructor(
    @InjectModel(PushSuscripcion.name)
    private readonly suscripcionModel: Model<PushSuscripcionDocument>,
    @InjectModel(ConfigVapid.name)
    private readonly configModel: Model<ConfigVapidDocument>,
  ) {}

  // Carga (o genera la primera vez) las claves VAPID desde Mongo:
  // deben ser ESTABLES — regenerarlas invalidaría toda suscripción.
  async onModuleInit(): Promise<void> {
    let config = await this.configModel.findOne({ clave: 'vapid' }).lean();
    if (!config) {
      const claves = webpush.generateVAPIDKeys();
      config = await (
        await this.configModel.create({
          clave: 'vapid',
          publica: claves.publicKey,
          privada: claves.privateKey,
        })
      ).toObject();
      this.logger.log('Claves VAPID generadas y persistidas (primera vez)');
    }
    this.clavePublica = config.publica;
    webpush.setVapidDetails('mailto:funes.gvr@gmail.com', config.publica, config.privada);
  }

  getClavePublica(): string {
    return this.clavePublica;
  }

  async suscribir(sub: { endpoint: string; keys: { p256dh: string; auth: string } }) {
    await this.suscripcionModel.findOneAndUpdate(
      { endpoint: sub.endpoint },
      { endpoint: sub.endpoint, claves: sub.keys },
      { upsert: true },
    );
    return { ok: true };
  }

  async desuscribir(endpoint: string): Promise<void> {
    await this.suscripcionModel.deleteOne({ endpoint });
  }

  // Envía a TODAS las suscripciones (single-user hoy: son sus navegadores).
  // Un endpoint muerto (410/404: el usuario revocó el permiso) se borra —
  // la limpieza es parte del envío, no un cron aparte.
  async notificarTodos(titulo: string, cuerpo: string, url: string): Promise<number> {
    const suscripciones = await this.suscripcionModel.find().lean();
    let enviadas = 0;

    for (const s of suscripciones) {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: s.claves },
          JSON.stringify({ titulo, cuerpo, url }),
        );
        enviadas++;
      } catch (err: any) {
        if (err?.statusCode === 410 || err?.statusCode === 404) {
          await this.suscripcionModel.deleteOne({ endpoint: s.endpoint });
          this.logger.log('Suscripción muerta eliminada');
        } else {
          this.logger.warn(`Push falló: ${err?.message}`);
        }
      }
    }
    return enviadas;
  }
}
