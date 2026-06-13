"use server"

import { revalidatePath } from "next/cache"

import { createClient } from "@/lib/supabase/server"

type AreaInput = {
  piso: string
  nombre: string
  filas: number
  acomodadoresNecesarios: number
  hermanasNecesarias: number
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
    hermanas_necesarias: values.hermanasNecesarias,
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
      hermanas_necesarias: values.hermanasNecesarias,
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

// Asigna (o quita, con capitanId = null) el capitán de un área. La relación
// área↔capitán se guarda en capitanes.area como etiquetas "piso — nombre", así
// que asignar = agregar la etiqueta al capitán elegido y quitarla de cualquier
// otro capitán que la tuviera (un área tiene un solo capitán).
export async function asignarCapitanArea(
  areaId: string,
  capitanId: string | null,
): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: "No autenticado" }

  const { data: area, error: areaErr } = await supabase
    .from("areas")
    .select("id, piso, nombre, asamblea_id")
    .eq("id", areaId)
    .single()
  if (areaErr || !area) {
    return { error: areaErr?.message ?? "Área no encontrada" }
  }

  const label = `${area.piso} — ${area.nombre}`

  // Quita la etiqueta de cualquier otro capitán que ya la tuviera.
  const { data: previos, error: previosErr } = await supabase
    .from("capitanes")
    .select("id, area")
    .eq("asamblea_id", area.asamblea_id)
    .contains("area", [label])
  if (previosErr) return { error: previosErr.message }

  for (const c of previos ?? []) {
    if (c.id === capitanId) continue
    const next = (c.area ?? []).filter((l: string) => l !== label)
    const { error } = await supabase
      .from("capitanes")
      .update({ area: next })
      .eq("id", c.id)
    if (error) return { error: error.message }
  }

  // Agrega la etiqueta al capitán elegido.
  if (capitanId) {
    const { data: target, error: targetErr } = await supabase
      .from("capitanes")
      .select("id, area")
      .eq("id", capitanId)
      .single()
    if (targetErr || !target) {
      return { error: targetErr?.message ?? "Capitán no encontrado" }
    }
    const current: string[] = target.area ?? []
    if (!current.includes(label)) {
      const { error } = await supabase
        .from("capitanes")
        .update({ area: [...current, label] })
        .eq("id", capitanId)
      if (error) return { error: error.message }
    }
  }

  revalidatePath("/areas")
  revalidatePath("/capitanes")
  revalidatePath("/acomodadores")
  return { error: null }
}
