"use server"

import { cookies } from "next/headers"
import { revalidatePath } from "next/cache"

import { registrarConsentimiento } from "@/lib/consentimiento"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

const DEVICE_COOKIE = "hermana_apoyo_device_key"

export async function claimAccess(
  accessToken: string,
): Promise<{ ok: boolean; error: string | null }> {
  const cookieStore = await cookies()
  const deviceKey = cookieStore.get(DEVICE_COOKIE)?.value
  if (!deviceKey) return { ok: false, error: "no_cookie" }

  const deviceKeyHash = await sha256(deviceKey)
  const supabase = await createClient()
  const { error } = await supabase.rpc("hermana_acceso_claim", {
    p_access_token: accessToken,
    p_device_key_hash: deviceKeyHash,
  })

  if (error) return { ok: false, error: error.message }

  try {
    const admin = createAdminClient()
    const { data: persona } = await admin
      .from("hermanas_apoyo")
      .select("nombre, apellido, telefono, asamblea_id")
      .eq("access_token", accessToken)
      .maybeSingle()
    if (persona) {
      await registrarConsentimiento({
        tipo: "aviso_primer_acceso",
        rol: "hermana",
        asambleaId: persona.asamblea_id,
        titularNombre: `${persona.nombre ?? ""} ${persona.apellido ?? ""}`.trim(),
        titularTelefono: persona.telefono,
      })
    }
  } catch {
    /* no bloqueamos el claim si falla el registro de auditoría */
  }

  revalidatePath(`/hermana-apoyo/${accessToken}`)
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
  const { error } = await supabase.rpc("hermana_acceso_rebind", {
    p_access_token: accessToken,
    p_device_key_hash: deviceKeyHash,
  })
  if (error) return { ok: false, error: error.message }

  revalidatePath(`/hermana-apoyo/${accessToken}`)
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
  const { error } = await supabase.rpc("hermana_acceso_toggle_asistencia", {
    p_access_token: input.accessToken,
    p_device_key_hash: deviceKeyHash,
    p_slot: input.slot,
    p_confirmar: input.confirmar,
  })
  if (error) return { ok: false, error: error.message }
  revalidatePath(`/hermana-apoyo/${input.accessToken}`)
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
