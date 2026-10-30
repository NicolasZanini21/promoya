// Service worker de DescuentoHoy: habilita instalación como PWA y
// recibe las notificaciones Web Push cuando el job diario detecta una
// promo nueva en un rubro al que el usuario está suscripto.

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Disparado por el servidor (Web Push) cuando hay una promo nueva.
self.addEventListener("push", (event) => {
  let data = { title: "DescuentoHoy", body: "Hay una promo nueva en tus rubros." };
  try {
    if (event.data) data = event.data.json();
  } catch {
    // payload no era JSON, se usa el default
  }

  const options = {
    body: data.body,
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    data: { url: data.url || "/" },
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

// Al tocar la notificación, abre (o enfoca) la app en la promo correspondiente.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(url) && "focus" in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});
