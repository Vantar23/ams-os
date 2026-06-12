"use server"

// Acciones del menú de capitán (/capitan). El capitán entra con su sesión
// normal; los RPC resuelven su identidad por capitanes.user_id = auth.uid(),
// así que aquí no viaja ningún token.

import { revalidatePath } from "next/cache"

import { pushParaAdmins } from "@/lib/push/server"
import { createAdminClient } from "@/lib/supabase/admin"
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

export async function reportarIncidenciaCapitan(
  formData: FormData,
): Promise<{ ok: boolean; error: string | null }> {
  const tipo = String(formData.get("tipo") ?? "").trim()
  const ubicacion = String(formData.get("ubicacion") ?? "").trim()
  const descripcion = String(formData.get("descripcion") ?? "").trim()
  const foto = formData.get("foto") as File | null

  if (!tipo) return { ok: false, error: "Selecciona o escribe el tipo." }
  if (!foto || foto.size === 0) {
    return { ok: false, error: "Adjunta una foto de la incidencia." }
  }

  const supabase = await createClient()
  const { data } = await supabase.rpc("capitan_actual")
  const capitan = (data ?? [])[0] as
    | { id: string; asamblea_id: string }
    | undefined
  if (!capitan) {
    return { ok: false, error: "Tu sesión no está vinculada a un capitán." }
  }

  const admin = createAdminClient()
  const ext = guessExt(foto.type, foto.name)
  const fotoPath = `${capitan.asamblea_id}/${crypto.randomUUID()}.${ext}`
  const { error: upErr } = await admin.storage
    .from("incidencias")
    .upload(fotoPath, foto, {
      contentType: foto.type || "image/jpeg",
      upsert: false,
    })
  if (upErr) {
    return { ok: false, error: `No se pudo subir la foto: ${upErr.message}` }
  }

  const { error: insertErr } = await admin.from("incidencias").insert({
    asamblea_id: capitan.asamblea_id,
    tipo,
    ubicacion: ubicacion || null,
    descripcion: descripcion || null,
    foto_path: fotoPath,
    reportado_por_capitan_id: capitan.id,
  })
  if (insertErr) {
    await admin.storage.from("incidencias").remove([fotoPath])
    return { ok: false, error: insertErr.message }
  }

  try {
    await pushParaAdmins(capitan.asamblea_id, {
      titulo: "Nueva incidencia",
      cuerpo: [tipo, ubicacion].filter(Boolean).join(" · "),
      url: "/incidencias",
    })
  } catch {
    /* push opcional */
  }

  revalidatePath("/capitan/incidencias")
  revalidatePath("/incidencias")
  return { ok: true, error: null }
}

function guessExt(mime: string, name: string): string {
  if (mime === "image/png") return "png"
  if (mime === "image/webp") return "webp"
  if (mime === "image/heic") return "heic"
  if (mime === "image/heif") return "heif"
  const fromName = name.split(".").pop()?.toLowerCase()
  if (fromName && /^[a-z0-9]{2,5}$/.test(fromName)) return fromName
  return "jpg"
}
