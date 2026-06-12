"use server"

// Acciones del menú de capitán (/capitan). El capitán entra con su sesión
// normal; los RPC resuelven su identidad por capitanes.user_id = auth.uid(),
// así que aquí no viaja ningún token.

import { pushParaAdmins } from "@/lib/push/server"
import { createClient } from "@/lib/supabase/server"

export type MensajeCapitan = {
  id: string
  remitente: "persona" | "admin"
  cuerpo: string
  created_at: string
}

export async function listarMensajesCapitan(): Promise<{
  ok: boolean
  error: string | null
  mensajes: MensajeCapitan[]
}> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc("mensajes_listar_capitan")
  if (error) return { ok: false, error: error.message, mensajes: [] }
  return { ok: true, error: null, mensajes: (data ?? []) as MensajeCapitan[] }
}

export async function enviarMensajeCapitan(
  cuerpo: string,
): Promise<{ ok: boolean; error: string | null }> {
  const texto = cuerpo.trim()
  if (!texto) return { ok: false, error: "Escribe un mensaje." }
  if (texto.length > 2000) {
    return { ok: false, error: "El mensaje es demasiado largo." }
  }

  const supabase = await createClient()
  const { error } = await supabase.rpc("mensajes_enviar_capitan", {
    p_cuerpo: texto,
  })
  if (error) return { ok: false, error: error.message }

  // Push a los admins; nunca rompe el envío del mensaje.
  try {
    const { data } = await supabase.rpc("capitan_actual")
    const capitan = (data ?? [])[0] as
      | { id: string; asamblea_id: string }
      | undefined
    if (capitan) {
      await pushParaAdmins(capitan.asamblea_id, {
        titulo: "Nuevo mensaje de un capitán",
        cuerpo: texto,
        url: "/mensajes",
        tag: `msg-${capitan.id}`,
      })
    }
  } catch {
    /* push opcional */
  }
  return { ok: true, error: null }
}
