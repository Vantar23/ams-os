"use server"

import { revalidatePath } from "next/cache"

import { createClient } from "@/lib/supabase/server"

export async function asignarPuesto(input: {
  asambleaId: string
  areaId: string
  acomodadorId: string
  slot: string
}): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: "No autenticado" }

  // Replace any existing assignment for this acomodador+slot.
  const { error: delErr } = await supabase
    .from("asignaciones")
    .delete()
    .eq("acomodador_id", input.acomodadorId)
    .eq("slot", input.slot)
  if (delErr) return { error: delErr.message }

  const { error } = await supabase.from("asignaciones").insert({
    asamblea_id: input.asambleaId,
    area_id: input.areaId,
    acomodador_id: input.acomodadorId,
    slot: input.slot,
  })

  if (error) return { error: error.message }
  revalidatePath("/puestos")
  return { error: null }
}

export async function quitarPuesto(input: {
  acomodadorId: string
  slot: string
}): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: "No autenticado" }

  const { error } = await supabase
    .from("asignaciones")
    .delete()
    .eq("acomodador_id", input.acomodadorId)
    .eq("slot", input.slot)

  if (error) return { error: error.message }
  revalidatePath("/puestos")
  return { error: null }
}
