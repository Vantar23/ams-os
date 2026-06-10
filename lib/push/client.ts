// Suscripción a Web Push desde el navegador (panel y portales).

export type SuscripcionJson = {
  endpoint: string
  p256dh: string
  auth: string
}

export function soportaPush(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    typeof Notification !== "undefined"
  )
}

/** iPhone/iPad en Safari normal: el push solo funciona instalada en inicio. */
export function esIosSinInstalar(): boolean {
  if (typeof window === "undefined") return false
  const esIos = /iphone|ipad|ipod/i.test(navigator.userAgent)
  const instalada =
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as { standalone?: boolean }).standalone === true
  return esIos && !instalada
}

/** True si este navegador ya tiene una suscripción push activa. */
export async function tienePushActivo(): Promise<boolean> {
  if (!soportaPush()) return false
  try {
    const registro = await navigator.serviceWorker.getRegistration()
    const sub = await registro?.pushManager.getSubscription()
    return Boolean(sub)
  } catch {
    return false
  }
}

/**
 * Pide permiso, registra el service worker y devuelve la suscripción push.
 * Devuelve null si el usuario no concede el permiso o el navegador no
 * soporta push (en ese caso quedan las notificaciones locales).
 */
export async function suscribirNavegador(
  vapidPublicKey: string,
): Promise<SuscripcionJson | null> {
  if (!soportaPush()) return null
  const permiso = await Notification.requestPermission()
  if (permiso !== "granted") return null

  const registro = await navigator.serviceWorker.register("/sw.js")
  await navigator.serviceWorker.ready
  const sub =
    (await registro.pushManager.getSubscription()) ??
    (await registro.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: base64UrlAUint8Array(vapidPublicKey),
    }))

  const json = sub.toJSON()
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return null
  return {
    endpoint: json.endpoint,
    p256dh: json.keys.p256dh,
    auth: json.keys.auth,
  }
}

function base64UrlAUint8Array(base64Url: string): Uint8Array<ArrayBuffer> {
  const relleno = "=".repeat((4 - (base64Url.length % 4)) % 4)
  const base64 = (base64Url + relleno).replace(/-/g, "+").replace(/_/g, "/")
  const binario = window.atob(base64)
  const bytes = new Uint8Array(new ArrayBuffer(binario.length))
  for (let i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i)
  return bytes
}
