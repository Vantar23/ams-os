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
  const categoria = String(formData.get("categoria") ?? "").trim()
  const descripcion = String(formData.get("descripcion") ?? "").trim()
  const foto = formData.get("foto") as File | null

  if (!accessToken) return { ok: false, error: "Token inválido." }
  if (!categoria) {
    return { ok: false, error: "Selecciona o escribe una categoría." }
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

  let fotoPath: string | null = null
  if (foto && foto.size > 0) {
    const ext = guessExt(foto.type, foto.name)
    fotoPath = `${acomodador.asamblea_id}/${crypto.randomUUID()}.${ext}`
    const { error: upErr } = await admin.storage
      .from("recepcion-local")
      .upload(fotoPath, foto, {
        contentType: foto.type || "image/jpeg",
        upsert: false,
      })
    if (upErr) {
      return { ok: false, error: `No se pudo subir la foto: ${upErr.message}` }
    }
  }

  const { error: insertErr } = await admin
    .from("recepcion_local_items")
    .insert({
      asamblea_id: acomodador.asamblea_id,
      categoria,
      descripcion: descripcion || null,
      foto_path: fotoPath,
      reportado_por_acomodador_id: acomodador.id,
    })
  if (insertErr) {
    if (fotoPath) {
      await admin.storage.from("recepcion-local").remove([fotoPath])
    }
    return { ok: false, error: insertErr.message }
  }

  revalidatePath(`/acomodador/${accessToken}/recepcion-local`)
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
