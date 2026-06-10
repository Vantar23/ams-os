// Service worker de AMS-OS: recibe Web Push y muestra la notificación.

self.addEventListener("install", () => {
  self.skipWaiting()
})

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener("push", (event) => {
  let datos = {}
  try {
    datos = event.data ? event.data.json() : {}
  } catch {
    datos = { titulo: "AMS-OS", cuerpo: event.data ? event.data.text() : "" }
  }
  const titulo = datos.titulo || "AMS-OS"
  event.waitUntil(
    self.registration.showNotification(titulo, {
      body: datos.cuerpo || "",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      tag: datos.tag || "ams-os",
      data: { url: datos.url || "/" },
    }),
  )
})

self.addEventListener("notificationclick", (event) => {
  event.notification.close()
  const url = (event.notification.data && event.notification.data.url) || "/"
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((ventanas) => {
        for (const v of ventanas) {
          if ("focus" in v) {
            v.focus()
            if ("navigate" in v) v.navigate(url)
            return
          }
        }
        return self.clients.openWindow(url)
      }),
  )
})
