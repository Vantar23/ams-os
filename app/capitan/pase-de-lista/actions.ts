"use server"

import { revalidatePath } from "next/cache"

import { createClient } from "@/lib/supabase/server"

const ERROR_LABEL: Record<string, string> = {
  not_capitan: "Tu sesión no está vinculada a un capitán.",
  invalid_estado: "Estado de asistencia no válido.",
  area_no_asignada: "Ese puesto no está en una de tus áreas.",
}

export async function marcarAsistencia(input: {
  asignacionId: string
  estado: "presente" | "necesita_remplazo"
}): Promise<{ ok: boolean; error: string | null }> {
  const supabase = await createClient()
  const { error } = await supabase.rpc("capitan_marcar_asistencia", {
    p_asignacion_id: input.asignacionId,
    p_estado: input.estado,
  })
  if (error) {
    const clave = Object.keys(ERROR_LABEL).find((k) =>
      error.message.includes(k),
    )
    return { ok: false, error: clave ? ERROR_LABEL[clave] : error.message }
  }
  revalidatePath("/capitan/pase-de-lista")
  revalidatePath("/remplazos")
  return { ok: true, error: null }
}
