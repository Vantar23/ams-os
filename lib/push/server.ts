// Envío de Web Push desde el servidor. Las llaves VAPID se generan una sola
// vez y viven en la tabla `webpush_config` (solo service role), así no hay
// que configurar variables de entorno adicionales.

import webpush from "web-push"

import { createAdminClient } from "@/lib/supabase/admin"

const VAPID_SUBJECT = "mailto:davidantarenas@icloud.com"

export type PushPayload = {
  titulo: string
  cuerpo: string
  url: string
  tag?: string
}

type Suscripcion = {
  id: string
  endpoint: string
  p256dh: string
  auth: string
}

export async function obtenerVapidPublicKey(): Promise<string | null> {
  const config = await obtenerConfig()
  return config?.publicKey ?? null
}

async function obtenerConfig(): Promise<{
  publicKey: string
  privateKey: string
} | null> {
  try {
    const admin = createAdminClient()
    const { data } = await admin
      .from("webpush_config")
      .select("public_key, private_key")
      .eq("id", 1)
      .maybeSingle()
    if (data) {
      return { publicKey: data.public_key, privateKey: data.private_key }
    }
    // Primera vez: genera y guarda las llaves. Si dos peticiones compiten,
    // el conflicto de PK deja ganar a la primera y releemos.
    const keys = webpush.generateVAPIDKeys()
    const { error } = await admin.from("webpush_config").insert({
      id: 1,
      public_key: keys.publicKey,
      private_key: keys.privateKey,
    })
    if (!error) {
      return { publicKey: keys.publicKey, privateKey: keys.privateKey }
    }
    const { data: otra } = await admin
      .from("webpush_config")
      .select("public_key, private_key")
      .eq("id", 1)
      .maybeSingle()
    return otra
      ? { publicKey: otra.public_key, privateKey: otra.private_key }
      : null
  } catch {
    return null
  }
}

export async function guardarSuscripcion(input: {
  asambleaId: string
  destinatario: "admin" | "acomodador" | "hermana"
  userId?: string | null
  personaId?: string | null
  endpoint: string
  p256dh: string
  auth: string
}): Promise<{ ok: boolean; error: string | null }> {
  const admin = createAdminClient()
  const { error } = await admin.from("push_suscripciones").upsert(
    {
      asamblea_id: input.asambleaId,
      destinatario: input.destinatario,
      user_id: input.userId ?? null,
      persona_id: input.personaId ?? null,
      endpoint: input.endpoint,
      p256dh: input.p256dh,
      auth: input.auth,
    },
    { onConflict: "endpoint" },
  )
  if (error) return { ok: false, error: error.message }
  return { ok: true, error: null }
}

/** Push a todos los admins (miembros del panel) de la asamblea. */
export async function pushParaAdmins(
  asambleaId: string,
  payload: PushPayload,
): Promise<void> {
  const admin = createAdminClient()
  const { data } = await admin
    .from("push_suscripciones")
    .select("id, endpoint, p256dh, auth")
    .eq("asamblea_id", asambleaId)
    .eq("destinatario", "admin")
  await enviar((data ?? []) as Suscripcion[], payload)
}

/** Push a los dispositivos de una persona del portal. */
export async function pushParaPersona(
  asambleaId: string,
  tipo: "acomodador" | "hermana",
  personaId: string,
  payload: PushPayload,
): Promise<void> {
  const admin = createAdminClient()
  const { data } = await admin
    .from("push_suscripciones")
    .select("id, endpoint, p256dh, auth")
    .eq("asamblea_id", asambleaId)
    .eq("destinatario", tipo)
    .eq("persona_id", personaId)
  await enviar((data ?? []) as Suscripcion[], payload)
}

async function enviar(
  subs: Suscripcion[],
  payload: PushPayload,
): Promise<void> {
  if (subs.length === 0) return
  const config = await obtenerConfig()
  if (!config) return
  webpush.setVapidDetails(VAPID_SUBJECT, config.publicKey, config.privateKey)

  const cuerpo = JSON.stringify(payload)
  const caducadas: string[] = []
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: s.endpoint,
            keys: { p256dh: s.p256dh, auth: s.auth },
          },
          cuerpo,
          { TTL: 60 * 60 },
        )
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode
        if (status === 404 || status === 410) caducadas.push(s.id)
      }
    }),
  )
  if (caducadas.length > 0) {
    const admin = createAdminClient()
    await admin.from("push_suscripciones").delete().in("id", caducadas)
  }
}
