import { headers } from "next/headers"

import { createAdminClient } from "@/lib/supabase/admin"

// Versión del aviso de privacidad vigente. Súbela cuando cambie el texto del
// aviso para que la bitácora refleje qué versión aceptó cada persona.
export const AVISO_VERSION = "2026-06-20"

type TipoConsentimiento =
  | "registro" // el titular acepta al registrarse a sí mismo
  | "autorizacion_tercero" // quien captura confirma que tiene autorización
  | "aviso_primer_acceso" // el titular acepta el aviso en su primer acceso

// Persiste un registro en la bitácora `consentimientos`. Best-effort: si algo
// falla (p. ej. la migración aún no se aplicó) se registra en consola pero no
// se interrumpe la operación principal.
export async function registrarConsentimiento(input: {
  tipo: TipoConsentimiento
  rol?: string | null
  asambleaId?: string | null
  titularNombre?: string | null
  titularTelefono?: string | null
  otorganteUserId?: string | null
  referencia?: string | null
}): Promise<void> {
  try {
    const h = await headers()
    const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null
    const userAgent = h.get("user-agent")

    const admin = createAdminClient()
    const { error } = await admin.from("consentimientos").insert({
      tipo: input.tipo,
      rol: input.rol ?? null,
      asamblea_id: input.asambleaId ?? null,
      titular_nombre: input.titularNombre ?? null,
      titular_telefono: input.titularTelefono ?? null,
      otorgante_user_id: input.otorganteUserId ?? null,
      referencia: input.referencia ?? null,
      version_aviso: AVISO_VERSION,
      user_agent: userAgent,
      ip,
    })
    if (error) {
      console.error("registrarConsentimiento:", error.message)
    }
  } catch (e) {
    console.error("registrarConsentimiento:", e)
  }
}
