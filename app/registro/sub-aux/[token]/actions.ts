"use server"

import { registrarConsentimiento } from "@/lib/consentimiento"
import { isValidPhone, normalizePhone, TELEFONO_INVALIDO_MSG } from "@/lib/phone"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

export async function submitSubAuxRegistro(input: {
  token: string
  nombre: string
  apellido: string
  congregacion: string
  telefono: string
  area: string[]
  notas: string
  disponibilidad: string[]
}): Promise<{ ok: boolean; error: string | null }> {
  const telefono = normalizePhone(input.telefono)
  if (!isValidPhone(telefono)) {
    return { ok: false, error: TELEFONO_INVALIDO_MSG }
  }
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "No autenticado" }

  const { error } = await supabase.rpc("registro_sub_aux_submit", {
    p_token: input.token,
    p_nombre: input.nombre,
    p_apellido: input.apellido,
    p_congregacion: input.congregacion,
    p_telefono: telefono,
    p_area: input.area,
    p_notas: input.notas,
    p_disponibilidad: input.disponibilidad,
  })

  if (error) {
    let message = error.message
    if (message.includes("phone_or_user_already_registered")) {
      message = "Ya hay un registro con ese teléfono o esa cuenta en la asamblea."
    } else if (message.includes("invalid_or_expired_registration_token")) {
      message = "Este enlace ya no es válido o expiró."
    } else if (message.includes("invalid_target_role")) {
      message = "Este enlace no es para subcapitán o auxiliar."
    } else if (message.includes("not_authenticated")) {
      message = "Tu sesión expiró. Recarga la página y vuelve a intentar."
    }
    return { ok: false, error: message }
  }

  // Belt-and-suspenders: ensure the asamblea_miembros row exists with the
  // correct role. The RPC also inserts it, but we're tolerant of races.
  const admin = createAdminClient()
  const { data: persona } = await admin
    .from("sub_aux")
    .select("asamblea_id, role")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (persona?.asamblea_id) {
    const { error: miembroErr } = await admin
      .from("asamblea_miembros")
      .insert({
        asamblea_id: persona.asamblea_id,
        user_id: user.id,
        role: persona.role as string,
      })
    if (miembroErr && miembroErr.code !== "23505") {
      return { ok: false, error: miembroErr.message }
    }
  }

  await registrarConsentimiento({
    tipo: "registro",
    rol: (persona?.role as string) ?? "sub_aux",
    asambleaId: persona?.asamblea_id ?? null,
    titularNombre: `${input.nombre} ${input.apellido}`.trim(),
    titularTelefono: telefono,
    otorganteUserId: user.id,
    referencia: input.token,
  })

  return { ok: true, error: null }
}
