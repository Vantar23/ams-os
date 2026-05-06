"use server"

import { revalidatePath } from "next/cache"

import { createClient } from "@/lib/supabase/server"

type AgregarMapaInput = {
  nombre: string
  descripcion: string
  storagePath: string
  archivo: string
  size: number
  mimeType: string
}

export async function agregarMapa(
  asambleaId: string,
  values: AgregarMapaInput,
): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: "No autenticado" }

  const { error } = await supabase.from("mapas").insert({
    asamblea_id: asambleaId,
    nombre: values.nombre,
    descripcion: values.descripcion || null,
    storage_path: values.storagePath,
    archivo: values.archivo,
    size: values.size,
    mime_type: values.mimeType || null,
    created_by: user.id,
  })

  if (error) return { error: error.message }
  revalidatePath("/mapa")
  return { error: null }
}

export async function eliminarMapa(
  mapaId: string,
): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: "No autenticado" }

  const { data: mapa } = await supabase
    .from("mapas")
    .select("storage_path")
    .eq("id", mapaId)
    .maybeSingle()

  const { error } = await supabase.from("mapas").delete().eq("id", mapaId)
  if (error) return { error: error.message }

  if (mapa?.storage_path) {
    await supabase.storage.from("mapas").remove([mapa.storage_path])
  }

  revalidatePath("/mapa")
  return { error: null }
}
