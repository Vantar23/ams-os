"use server"

import { revalidatePath } from "next/cache"

import { createClient } from "@/lib/supabase/server"

const ERROR_LABEL: Record<string, string> = {
  not_capitan: "Tu sesión no está vinculada a un capitán.",
  invalid_slot: "Elige un día y una sesión válidos.",
  invalid_valor: "El conteo no puede ser negativo.",
  area_no_asignada: "Esa área no está asignada a ti.",
  excede_capacidad: "El conteo no puede ser mayor a la capacidad del área.",
}

export async function reportarConteoCapitan(input: {
  areaId: string
  slot: string
  valor: number
}): Promise<{ ok: boolean; error: string | null }> {
  const supabase = await createClient()
  const { error } = await supabase.rpc("capitan_reportar_conteo", {
    p_area_id: input.areaId,
    p_slot: input.slot,
    p_valor: input.valor,
  })
  if (error) {
    const clave = Object.keys(ERROR_LABEL).find((k) =>
      error.message.includes(k),
    )
    return { ok: false, error: clave ? ERROR_LABEL[clave] : error.message }
  }
  revalidatePath("/capitan/asistencia")
  revalidatePath("/asistencia")
  return { ok: true, error: null }
}
