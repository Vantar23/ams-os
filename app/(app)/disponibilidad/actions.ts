"use server"

import { revalidatePath } from "next/cache"

import { createClient } from "@/lib/supabase/server"

export async function toggleAsistencia(input: {
  tipo: "capitan" | "acomodador" | "hermana"
  id: string
  slot: string
  confirmar: boolean
}): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: "No autenticado" }

  const table =
    input.tipo === "capitan"
      ? "capitanes"
      : input.tipo === "hermana"
        ? "hermanas_apoyo"
        : "acomodadores"

  const { data: row, error: fetchError } = await supabase
    .from(table)
    .select("asistencia_confirmada")
    .eq("id", input.id)
    .single()
  if (fetchError) return { error: fetchError.message }

  const current = (row?.asistencia_confirmada as string[]) ?? []
  const set = new Set(current)
  if (input.confirmar) set.add(input.slot)
  else set.delete(input.slot)

  const { error } = await supabase
    .from(table)
    .update({ asistencia_confirmada: Array.from(set) })
    .eq("id", input.id)
  if (error) return { error: error.message }

  revalidatePath("/disponibilidad")
  return { error: null }
}
