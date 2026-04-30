"use server"

import { createClient } from "@/lib/supabase/server"

type Tipo = "acomodador" | "hermana"

export async function confirmAsistencia(input: {
  asambleaId: string
  slot: string
  tipo?: Tipo
  id?: string
  telefono?: string
}): Promise<{
  ok: boolean
  error: string | null
  result: { tipo: Tipo; id: string; nombre: string; apellido: string } | null
}> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc("asistencia_general_confirm", {
    p_asamblea_id: input.asambleaId,
    p_slot: input.slot,
    p_tipo: input.tipo ?? null,
    p_id: input.id ?? null,
    p_telefono: input.telefono ?? null,
  })

  if (error) {
    let message = error.message
    if (message.includes("not_found")) {
      message = "No encontramos a nadie con ese teléfono en esta asamblea."
    } else if (message.includes("invalid_slot")) {
      message = "Sesión inválida."
    } else if (message.includes("invalid_telefono")) {
      message = "Teléfono inválido."
    } else if (message.includes("missing_identification")) {
      message = "Falta el identificador."
    }
    return { ok: false, error: message, result: null }
  }

  const row = (data ?? [])[0] as
    | { out_tipo: Tipo; out_id: string; out_nombre: string; out_apellido: string }
    | undefined
  if (!row) return { ok: false, error: "No encontrado.", result: null }

  return {
    ok: true,
    error: null,
    result: {
      tipo: row.out_tipo,
      id: row.out_id,
      nombre: row.out_nombre,
      apellido: row.out_apellido,
    },
  }
}
