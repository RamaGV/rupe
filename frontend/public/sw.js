// public/sw.js — service worker mínimo: SOLO push (sin caché offline).
// Recibe el push del backend aunque la pestaña esté cerrada y muestra
// la notificación nativa del sistema operativo.
self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {};
  event.waitUntil(
    self.registration.showNotification(data.titulo ?? 'Boletín de Contrataciones', {
      body: data.cuerpo ?? '',
      data: { url: data.url ?? '/' },
      icon: '/favicon.ico',
      badge: '/favicon.ico',
    }),
  );
});

// click en la notificación → abre (o enfoca) el boletín en esa página
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((ventanas) => {
      const abierta = ventanas.find((v) => 'focus' in v);
      if (abierta) {
        abierta.navigate(url);
        return abierta.focus();
      }
      return clients.openWindow(url);
    }),
  );
});
