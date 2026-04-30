"use server"

import { createClient } from "@/lib/supabase/server"

import type { AreaCapitan } from "@/app/(app)/capitanes/areas"

export async function submitCapitanRegistro(input: {
  token: string
  nombre: string
  apellido: string
  congregacion: string
  telefono: string
  area: AreaCapitan
  notas: string
  disponibilidad: string[]
}): Promise<{ ok: boolean; error: string | null }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "No autenticado" }

  const { error } = await supabase.rpc("registro_capitan_submit", {
    p_token: input.token,
    p_nombre: input.nombre,
    p_apellido: input.apellido,
    p_congregacion: input.congregacion,
    p_telefono: input.telefono,
    p_area: input.area,
    p_notas: input.notas,
    p_disponibilidad: input.disponibilidad,
  })

  if (error) {
    let message = error.message
    if (message.includes("phone_or_user_already_registered")) {
      message = "Ya hay un capitán con ese teléfono o esa cuenta en la asamblea."
    } else if (message.includes("invalid_or_expired_registration_token")) {
      message = "Este enlace ya no es válido o expiró."
    } else if (message.includes("invalid_target_role")) {
      message = "Este enlace no es para capitanes."
    } else if (message.includes("not_authenticated")) {
      message = "Tu sesión expiró. Recarga la página y vuelve a intentar."
    }
    return { ok: false, error: message }
  }
  return { ok: true, error: null }
}
