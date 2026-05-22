"use server"

import { revalidatePath } from "next/cache"

import { createClient } from "@/lib/supabase/server"

export async function revertirAsistencia(
  historialId: string,
): Promise<{ ok: boolean; error: string | null }> {
  const supabase = await createClient()
  const { error } = await supabase.rpc("asistencia_revertir", {
    p_historial_id: historialId,
  })
  if (error) return { ok: false, error: error.message }
  revalidatePath("/asistencia")
  return { ok: true, error: null }
}
