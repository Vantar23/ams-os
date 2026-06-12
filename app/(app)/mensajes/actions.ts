"use server"

import { revalidatePath } from "next/cache"

import { pushParaPersona } from "@/lib/push/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

export async function enviarRespuestaAdmin(input: {
  asambleaId: string
  personaTipo: "acomodador" | "hermana" | "capitan"
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

  // Push al dispositivo de la persona; nunca rompe el envío. Los capitanes
  // leen desde /capitan con su sesión y aún no registran suscripciones push.
  if (input.personaTipo !== "capitan") {
    try {
      const admin = createAdminClient()
      const tabla =
        input.personaTipo === "acomodador" ? "acomodadores" : "hermanas_apoyo"
      const base =
        input.personaTipo === "acomodador" ? "/acomodador" : "/hermana-apoyo"
      const { data: persona } = await admin
        .from(tabla)
        .select("access_token")
        .eq("id", input.personaId)
        .maybeSingle()
      await pushParaPersona(input.asambleaId, input.personaTipo, input.personaId, {
        titulo: "Mensaje de administración",
        cuerpo: texto,
        url: persona?.access_token
          ? `${base}/${persona.access_token}/mensajes`
          : "/",
        tag: `respuesta-${input.personaId}`,
      })
    } catch {
      /* push opcional */
    }
  }

  revalidatePath("/mensajes")
  return { ok: true, error: null }
}

export async function enviarMensajeMasivo(input: {
  asambleaId: string
  destinatarios: "acomodadores" | "hermanas" | "capitanes" | "todos"
  cuerpo: string
}): Promise<{ ok: boolean; enviados: number; error: string | null }> {
  const texto = input.cuerpo.trim()
  if (!texto) return { ok: false, enviados: 0, error: "Escribe un mensaje." }
  if (texto.length > 2000) {
    return { ok: false, enviados: 0, error: "El mensaje es demasiado largo." }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, enviados: 0, error: "No autenticado" }

  // Los capitanes no tienen access_token: leen en /capitan/mensajes con su
  // sesión, así que su base no lleva token y no reciben push.
  const grupos: Array<{
    tipo: "acomodador" | "hermana" | "capitan"
    tabla: "acomodadores" | "hermanas_apoyo" | "capitanes"
    base: "/acomodador" | "/hermana-apoyo" | "/capitan"
  }> = []
  if (input.destinatarios === "acomodadores" || input.destinatarios === "todos") {
    grupos.push({ tipo: "acomodador", tabla: "acomodadores", base: "/acomodador" })
  }
  if (input.destinatarios === "hermanas" || input.destinatarios === "todos") {
    grupos.push({ tipo: "hermana", tabla: "hermanas_apoyo", base: "/hermana-apoyo" })
  }
  if (input.destinatarios === "capitanes" || input.destinatarios === "todos") {
    grupos.push({ tipo: "capitan", tabla: "capitanes", base: "/capitan" })
  }

  const personas: Array<{
    id: string
    access_token: string | null
    tipo: "acomodador" | "hermana" | "capitan"
    base: string
  }> = []
  for (const grupo of grupos) {
    const { data, error } = await supabase
      .from(grupo.tabla)
      .select(grupo.tipo === "capitan" ? "id" : "id, access_token")
      .eq("asamblea_id", input.asambleaId)
    if (error) return { ok: false, enviados: 0, error: error.message }
    for (const p of (data ?? []) as unknown as {
      id: string
      access_token?: string | null
    }[]) {
      personas.push({
        id: p.id,
        access_token: p.access_token ?? null,
        tipo: grupo.tipo,
        base: grupo.base,
      })
    }
  }
  if (personas.length === 0) {
    return { ok: false, enviados: 0, error: "No hay destinatarios." }
  }

  const { error } = await supabase.from("mensajes").insert(
    personas.map((p) => ({
      asamblea_id: input.asambleaId,
      persona_tipo: p.tipo,
      persona_id: p.id,
      remitente: "admin",
      admin_user_id: user.id,
      cuerpo: texto,
    })),
  )
  if (error) return { ok: false, enviados: 0, error: error.message }

  // Push a cada dispositivo; nunca rompe el envío.
  await Promise.allSettled(
    personas
      .filter((p) => p.tipo !== "capitan")
      .map((p) =>
        pushParaPersona(input.asambleaId, p.tipo as "acomodador" | "hermana", p.id, {
          titulo: "Mensaje de administración",
          cuerpo: texto,
          url: p.access_token ? `${p.base}/${p.access_token}/mensajes` : "/",
          tag: `aviso-${p.id}`,
        }),
      ),
  )

  revalidatePath("/mensajes")
  return { ok: true, enviados: personas.length, error: null }
}

export async function marcarMensajesLeidos(input: {
  asambleaId: string
  personaTipo: "acomodador" | "hermana" | "capitan"
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
