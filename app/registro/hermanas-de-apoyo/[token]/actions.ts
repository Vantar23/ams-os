"use server"

import { registrarConsentimiento } from "@/lib/consentimiento"
import { isValidPhone, normalizePhone, TELEFONO_INVALIDO_MSG } from "@/lib/phone"
import { createClient } from "@/lib/supabase/server"

export async function submitRegistro(input: {
  token: string
  nombre: string
  apellido: string
  congregacion: string
  telefono: string
  notas: string
  disponibilidad?: string[]
}): Promise<{ accessToken: string | null; error: string | null }> {
  const telefono = normalizePhone(input.telefono)
  if (!isValidPhone(telefono)) {
    return { accessToken: null, error: TELEFONO_INVALIDO_MSG }
  }
  const supabase = await createClient()
  const { data, error } = await supabase.rpc("registro_hermana_submit", {
    p_token: input.token,
    p_nombre: input.nombre,
    p_apellido: input.apellido,
    p_congregacion: input.congregacion,
    p_telefono: telefono,
    p_notas: input.notas,
    p_disponibilidad: input.disponibilidad ?? [],
  })

  if (error) {
    let message = error.message
    if (message.includes("phone_already_registered")) {
      message = "Este teléfono ya está registrado en esta asamblea."
    } else if (message.includes("invalid_or_expired_registration_token")) {
      message = "Este enlace ya no es válido o expiró."
    }
    return { accessToken: null, error: message }
  }

  await registrarConsentimiento({
    tipo: "registro",
    rol: "hermana",
    titularNombre: `${input.nombre} ${input.apellido}`.trim(),
    titularTelefono: telefono,
    referencia: input.token,
  })

  return { accessToken: data as string, error: null }
}
