"use server"

import { revalidatePath } from "next/cache"

import { createClient } from "@/lib/supabase/server"

export async function enviarRespuestaAdmin(input: {
  asambleaId: string
  personaTipo: "acomodador" | "hermana"
  personaId: string
  cuerpo: string
}): Promise<{ ok: boolean; error: string | null }> {
  const texto = input.cuerpo.trim()
  if (!texto) return { ok: false, error: "Escribe un mensaje." }
  if (texto.length > 2000) {
    return { ok: false, error: "El mensaje es demasiado largo." }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "No autenticado" }

  const { error } = await supabase.from("mensajes").insert({
    asamblea_id: input.asambleaId,
    persona_tipo: input.personaTipo,
    persona_id: input.personaId,
    remitente: "admin",
    admin_user_id: user.id,
    cuerpo: texto,
  })
  if (error) return { ok: false, error: error.message }
  revalidatePath("/mensajes")
  return { ok: true, error: null }
}

export async function marcarMensajesLeidos(input: {
  asambleaId: string
  personaTipo: "acomodador" | "hermana"
  personaId: string
}): Promise<{ ok: boolean; error: string | null }> {
  const supabase = await createClient()
  const { error } = await supabase
    .from("mensajes")
    .update({ leido: true })
    .eq("asamblea_id", input.asambleaId)
    .eq("persona_tipo", input.personaTipo)
    .eq("persona_id", input.personaId)
    .eq("remitente", "persona")
    .eq("leido", false)
  if (error) return { ok: false, error: error.message }
  revalidatePath("/mensajes")
  return { ok: true, error: null }
}
