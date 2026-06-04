"use server"

import { cookies } from "next/headers"
import { revalidatePath } from "next/cache"

import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

const DEVICE_COOKIE = "acomodador_device_key"

export async function claimAccess(
  accessToken: string,
): Promise<{ ok: boolean; error: string | null }> {
  const cookieStore = await cookies()
  const deviceKey = cookieStore.get(DEVICE_COOKIE)?.value
  if (!deviceKey) return { ok: false, error: "no_cookie" }

  const deviceKeyHash = await sha256(deviceKey)
  const supabase = await createClient()
  const { error } = await supabase.rpc("acceso_claim", {
    p_access_token: accessToken,
    p_device_key_hash: deviceKeyHash,
  })

  if (error) return { ok: false, error: error.message }

  revalidatePath(`/acomodador/${accessToken}`)
  return { ok: true, error: null }
}

export async function rebindAccess(
  accessToken: string,
): Promise<{ ok: boolean; error: string | null }> {
  const cookieStore = await cookies()
  const deviceKey = cookieStore.get(DEVICE_COOKIE)?.value
  if (!deviceKey) return { ok: false, error: "no_cookie" }

  const deviceKeyHash = await sha256(deviceKey)
  const supabase = await createClient()
  const { error } = await supabase.rpc("acceso_rebind", {
    p_access_token: accessToken,
    p_device_key_hash: deviceKeyHash,
  })
  if (error) return { ok: false, error: error.message }

  revalidatePath(`/acomodador/${accessToken}`)
  return { ok: true, error: null }
}

export async function reportarLugaresVacios(input: {
  accessToken: string
  asignacionId: string
  lugares: number
}): Promise<{ ok: boolean; error: string | null }> {
  if (!Number.isFinite(input.lugares) || input.lugares < 0) {
    return { ok: false, error: "Cantidad inválida." }
  }
  const cookieStore = await cookies()
  const deviceKey = cookieStore.get(DEVICE_COOKIE)?.value
  if (!deviceKey) return { ok: false, error: "no_cookie" }

  const deviceKeyHash = await sha256(deviceKey)
  const supabase = await createClient()
  const { error } = await supabase.rpc("acomodador_reportar_lugares", {
    p_access_token: input.accessToken,
    p_device_key_hash: deviceKeyHash,
    p_asignacion_id: input.asignacionId,
    p_lugares: input.lugares,
  })
  if (error) return { ok: false, error: error.message }

  // Guarda la entrada en el historial. No bloqueamos el éxito del reporte
  // si esto falla — el reporte vigente ya está guardado en asignaciones.
  try {
    const admin = createAdminClient()
    const { data: asignacion } = await admin
      .from("asignaciones")
      .select("asamblea_id, acomodador_id")
      .eq("id", input.asignacionId)
      .maybeSingle()
    if (asignacion) {
      await admin.from("asistencia_historial").insert({
        asignacion_id: input.asignacionId,
        asamblea_id: asignacion.asamblea_id,
        lugares_vacios: input.lugares,
        origen: "acomodador",
        reportado_por_acomodador_id: asignacion.acomodador_id,
      })
    }
  } catch {
    /* no rompemos el reporte si el historial falla */
  }

  revalidatePath(`/acomodador/${input.accessToken}/asistencia`)
  return { ok: true, error: null }
}

export async function toggleSelfAsistencia(input: {
  accessToken: string
  slot: string
  confirmar: boolean
}): Promise<{ ok: boolean; error: string | null }> {
  const cookieStore = await cookies()
  const deviceKey = cookieStore.get(DEVICE_COOKIE)?.value
  if (!deviceKey) return { ok: false, error: "no_cookie" }

  const deviceKeyHash = await sha256(deviceKey)
  const supabase = await createClient()
  const { error } = await supabase.rpc("acceso_toggle_asistencia", {
    p_access_token: input.accessToken,
    p_device_key_hash: deviceKeyHash,
    p_slot: input.slot,
    p_confirmar: input.confirmar,
  })
  if (error) return { ok: false, error: error.message }
  revalidatePath(`/acomodador/${input.accessToken}`)
  return { ok: true, error: null }
}

export async function reportarRecepcionLocal(
  formData: FormData,
): Promise<{ ok: boolean; error: string | null }> {
  const accessToken = String(formData.get("accessToken") ?? "")
  const desperfecto = String(formData.get("desperfecto") ?? "").trim()
  const descripcion = String(formData.get("descripcion") ?? "").trim()
  const nivel = String(formData.get("nivel") ?? "").trim()
  const zona = String(formData.get("zona") ?? "").trim()
  const butaca = String(formData.get("butaca") ?? "").trim()
  const otroObjeto = String(formData.get("otro_objeto") ?? "").trim()
  const foto = formData.get("foto") as File | null

  if (!accessToken) return { ok: false, error: "Token inválido." }
  if (!desperfecto) {
    return { ok: false, error: "Selecciona o escribe el desperfecto." }
  }
  if (!foto || foto.size === 0) {
    return { ok: false, error: "Adjunta una foto del problema." }
  }

  const cookieStore = await cookies()
  const deviceKey = cookieStore.get(DEVICE_COOKIE)?.value
  if (!deviceKey) return { ok: false, error: "no_cookie" }
  const deviceKeyHash = await sha256(deviceKey)

  const supabase = await createClient()
  const { data, error: openErr } = await supabase.rpc("acceso_open", {
    p_access_token: accessToken,
    p_device_key_hash: deviceKeyHash,
  })
  if (openErr) return { ok: false, error: openErr.message }
  const acomodador = (data ?? [])[0] as
    | { id: string; asamblea_id: string; is_unbound: boolean }
    | undefined
  if (!acomodador || acomodador.is_unbound) {
    return { ok: false, error: "Acceso inválido." }
  }

  const admin = createAdminClient()

  const ext = guessExt(foto.type, foto.name)
  const fotoPath = `${acomodador.asamblea_id}/${crypto.randomUUID()}.${ext}`
  const { error: upErr } = await admin.storage
    .from("recepcion-local")
    .upload(fotoPath, foto, {
      contentType: foto.type || "image/jpeg",
      upsert: false,
    })
  if (upErr) {
    return { ok: false, error: `No se pudo subir la foto: ${upErr.message}` }
  }

  const { error: insertErr } = await admin
    .from("recepcion_local_items")
    .insert({
      asamblea_id: acomodador.asamblea_id,
      desperfecto,
      descripcion: descripcion || null,
      nivel: nivel || null,
      zona: zona || null,
      butaca: butaca || null,
      otro_objeto: otroObjeto || null,
      foto_path: fotoPath,
      reportado_por_acomodador_id: acomodador.id,
    })
  if (insertErr) {
    await admin.storage.from("recepcion-local").remove([fotoPath])
    return { ok: false, error: insertErr.message }
  }

  revalidatePath(`/acomodador/${accessToken}/recepcion-local`)
  return { ok: true, error: null }
}

export async function reportarIncidencia(
  formData: FormData,
): Promise<{ ok: boolean; error: string | null }> {
  const accessToken = String(formData.get("accessToken") ?? "")
  const tipo = String(formData.get("tipo") ?? "").trim()
  const ubicacion = String(formData.get("ubicacion") ?? "").trim()
  const descripcion = String(formData.get("descripcion") ?? "").trim()
  const foto = formData.get("foto") as File | null

  if (!accessToken) return { ok: false, error: "Token inválido." }
  if (!tipo) return { ok: false, error: "Selecciona o escribe el tipo." }
  if (!foto || foto.size === 0) {
    return { ok: false, error: "Adjunta una foto de la incidencia." }
  }

  const cookieStore = await cookies()
  const deviceKey = cookieStore.get(DEVICE_COOKIE)?.value
  if (!deviceKey) return { ok: false, error: "no_cookie" }
  const deviceKeyHash = await sha256(deviceKey)

  const supabase = await createClient()
  const { data, error: openErr } = await supabase.rpc("acceso_open", {
    p_access_token: accessToken,
    p_device_key_hash: deviceKeyHash,
  })
  if (openErr) return { ok: false, error: openErr.message }
  const acomodador = (data ?? [])[0] as
    | { id: string; asamblea_id: string; is_unbound: boolean }
    | undefined
  if (!acomodador || acomodador.is_unbound) {
    return { ok: false, error: "Acceso inválido." }
  }

  const admin = createAdminClient()
  const ext = guessExt(foto.type, foto.name)
  const fotoPath = `${acomodador.asamblea_id}/${crypto.randomUUID()}.${ext}`
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
    asamblea_id: acomodador.asamblea_id,
    tipo,
    ubicacion: ubicacion || null,
    descripcion: descripcion || null,
    foto_path: fotoPath,
    reportado_por_acomodador_id: acomodador.id,
  })
  if (insertErr) {
    await admin.storage.from("incidencias").remove([fotoPath])
    return { ok: false, error: insertErr.message }
  }

  revalidatePath(`/acomodador/${accessToken}/incidencias`)
  return { ok: true, error: null }
}

function guessExt(mime: string, name: string): string {
  const fromMime: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/heic": "heic",
    "image/heif": "heif",
  }
  if (mime in fromMime) return fromMime[mime]
  const dot = name.lastIndexOf(".")
  if (dot >= 0 && dot < name.length - 1) {
    return name.slice(dot + 1).toLowerCase()
  }
  return "jpg"
}

async function sha256(input: string): Promise<string> {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(input),
  )
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}
