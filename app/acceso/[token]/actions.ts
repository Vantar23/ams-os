"use server"

import { cookies } from "next/headers"
import { revalidatePath } from "next/cache"

import { registrarConsentimiento } from "@/lib/consentimiento"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

const DEVICE_COOKIE = "acceso_device_key"

export async function claimPase(
  token: string,
): Promise<{ ok: boolean; error: string | null }> {
  const cookieStore = await cookies()
  const deviceKey = cookieStore.get(DEVICE_COOKIE)?.value
  if (!deviceKey) return { ok: false, error: "no_cookie" }

  const deviceKeyHash = await sha256(deviceKey)
  const supabase = await createClient()
  const { error } = await supabase.rpc("acceso_pase_claim", {
    p_access_token: token,
    p_device_key_hash: deviceKeyHash,
  })
  if (error) return { ok: false, error: error.message }

  try {
    const admin = createAdminClient()
    const { data: pase } = await admin
      .from("accesos_pases")
      .select("nombre, telefono, asamblea_id")
      .eq("access_token", token)
      .maybeSingle()
    if (pase && (pase.nombre || pase.telefono)) {
      await registrarConsentimiento({
        tipo: "aviso_primer_acceso",
        rol: "pase",
        asambleaId: pase.asamblea_id,
        titularNombre: pase.nombre,
        titularTelefono: pase.telefono,
      })
    }
  } catch {
    /* no bloqueamos el claim si falla el registro de auditoría */
  }

  revalidatePath(`/acceso/${token}`)
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
