"use server"

import { cookies } from "next/headers"
import { revalidatePath } from "next/cache"

import { registrarConsentimiento } from "@/lib/consentimiento"
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

  try {
    const admin = createAdminClient()
    const { data: persona } = await admin
      .from("acomodadores")
      .select("nombre, apellido, telefono, asamblea_id")
      .eq("access_token", accessToken)
      .maybeSingle()
    if (persona) {
      await registrarConsentimiento({
        tipo: "aviso_primer_acceso",
        rol: "acomodador",
        asambleaId: persona.asamblea_id,
        titularNombre: `${persona.nombre ?? ""} ${persona.apellido ?? ""}`.trim(),
        titularTelefono: persona.telefono,
      })
    }
  } catch {
    /* no bloqueamos el claim si falla el registro de auditoría */
  }

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

async function sha256(input: string): Promise<string> {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(input),
  )
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}
