"use server"

import { revalidatePath } from "next/cache"

import { createClient } from "@/lib/supabase/server"

type AreaInput = {
  piso: string
  nombre: string
  filas: number
  acomodadoresNecesarios: number
  capacidad: number
}

export async function agregarArea(
  asambleaId: string,
  values: AreaInput,
): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: "No autenticado" }

  const { error } = await supabase.from("areas").insert({
    asamblea_id: asambleaId,
    piso: values.piso,
    nombre: values.nombre,
    filas: values.filas,
    acomodadores_necesarios: values.acomodadoresNecesarios,
    capacidad: values.capacidad,
  })

  if (error) return { error: error.message }
  revalidatePath("/areas")
  return { error: null }
}

export async function actualizarArea(
  areaId: string,
  values: AreaInput,
): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: "No autenticado" }

  const { error } = await supabase
    .from("areas")
    .update({
      piso: values.piso,
      nombre: values.nombre,
      filas: values.filas,
      acomodadores_necesarios: values.acomodadoresNecesarios,
      capacidad: values.capacidad,
    })
    .eq("id", areaId)

  if (error) return { error: error.message }
  revalidatePath("/areas")
  return { error: null }
}

export async function eliminarArea(
  areaId: string,
): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: "No autenticado" }

  const { error } = await supabase.from("areas").delete().eq("id", areaId)
  if (error) return { error: error.message }
  revalidatePath("/areas")
  return { error: null }
}
