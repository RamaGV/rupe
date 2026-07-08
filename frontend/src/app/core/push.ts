// src/app/core/push.ts
import { Service, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { Api } from './api';

// Notificaciones push del navegador: el canal que funciona con la
// pestaña cerrada. El flujo: registrar sw.js → pedir permiso →
// PushManager.subscribe con la clave VAPID del backend → mandarle
// la suscripción para que el motor de alertas nos encuentre.
@Service()
export class Push {
  private api = inject(Api);

  soportado = signal(typeof navigator !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window);
  activo = signal(false);
  ocupado = signal(false);

  constructor() {
    if (this.soportado()) this.revisarEstado();
  }

  private async revisarEstado(): Promise<void> {
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = await reg?.pushManager.getSubscription();
    this.activo.set(!!sub);
  }

  async activar(): Promise<void> {
    this.ocupado.set(true);
    try {
      const permiso = await Notification.requestPermission();
      if (permiso !== 'granted') return;

      const reg = await navigator.serviceWorker.register('/sw.js');
      const { clave } = await firstValueFrom(this.api.get<{ clave: string }>('push/clave-publica'));
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true, // el navegador exige mostrar SIEMPRE algo
        applicationServerKey: base64aUint8(clave),
      });
      await firstValueFrom(this.api.post('push/suscripciones', sub.toJSON()));
      this.activo.set(true);
    } finally {
      this.ocupado.set(false);
    }
  }

  async desactivar(): Promise<void> {
    this.ocupado.set(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await firstValueFrom(
          this.api.delete(`push/suscripciones?endpoint=${encodeURIComponent(sub.endpoint)}`),
        ).catch(() => {});
        await sub.unsubscribe();
      }
      this.activo.set(false);
    } finally {
      this.ocupado.set(false);
    }
  }
}

// la clave VAPID viaja en base64url; PushManager quiere bytes sobre un
// ArrayBuffer REAL (TS 5.7 distingue ArrayBufferLike y BufferSource)
function base64aUint8(base64: string): Uint8Array<ArrayBuffer> {
  const relleno = '='.repeat((4 - (base64.length % 4)) % 4);
  const normal = (base64 + relleno).replace(/-/g, '+').replace(/_/g, '/');
  const crudo = atob(normal);
  const bytes = new Uint8Array(new ArrayBuffer(crudo.length));
  for (let i = 0; i < crudo.length; i++) bytes[i] = crudo.charCodeAt(i);
  return bytes;
}
