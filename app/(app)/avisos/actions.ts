"use server"

// Administración crea avisos (a pantalla completa) y preguntas de 2 opciones
// dirigidos a acomodadores, capitanes y/o hermanas de apoyo. El insert usa la
// sesión del miembro (RLS limita la creación a owner/subcapitán/auxiliar). Al
// publicar se envía Web Push a las audiencias elegidas (best-effort).

import { revalidatePath } from "next/cache"

import { pushAvisoPersonal, pushParaCapitanes } from "@/lib/push/server"
import { createClient } from "@/lib/supabase/server"

export type Audiencia = "acomodador" | "capitan" | "hermana"

export type CrearAvisoInput = {
  tipo: "aviso" | "pregunta"
  titulo: string
  cuerpo: string
  audiencias: Audiencia[]
  opcionA: string
  opcionB: string
  /** ISO (UTC) o null si no caduca. */
  expiraAt: string | null
}

const AUDIENCIAS_VALIDAS: Audiencia[] = ["acomodador", "capitan", "hermana"]

export async function crearAviso(
  input: CrearAvisoInput,
): Promise<{ ok: boolean; error: string | null }> {
  const titulo = input.titulo.trim()
  const cuerpo = input.cuerpo.trim()
  const opcionA = input.opcionA.trim()
  const opcionB = input.opcionB.trim()
  const audiencias = input.audiencias.filter((a) =>
    AUDIENCIAS_VALIDAS.includes(a),
  )

  if (!titulo) return { ok: false, error: "Escribe un título." }
  if (titulo.length > 200) return { ok: false, error: "El título es muy largo." }
  if (cuerpo.length > 2000) {
    return { ok: false, error: "El mensaje es demasiado largo." }
  }
  if (audiencias.length === 0) {
    return { ok: false, error: "Elige al menos una audiencia." }
  }
  if (input.tipo === "pregunta" && (!opcionA || !opcionB)) {
    return { ok: false, error: "Una pregunta necesita las dos opciones." }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "Sesión expirada." }

  const { data: asambleas } = await supabase
    .from("asambleas")
    .select("id")
    .order("created_at", { ascending: false })
    .limit(1)
  const asambleaId = asambleas?.[0]?.id as string | undefined
  if (!asambleaId) return { ok: false, error: "No hay asamblea activa." }

  const esPregunta = input.tipo === "pregunta"
  const { error } = await supabase.from("avisos").insert({
    asamblea_id: asambleaId,
    tipo: input.tipo,
    titulo,
    cuerpo: cuerpo || null,
    opcion_a: esPregunta ? opcionA : null,
    opcion_b: esPregunta ? opcionB : null,
    audiencias,
    expira_at: input.expiraAt,
    created_by: user.id,
  })
  if (error) return { ok: false, error: error.message }

  // Push a las audiencias. Nunca rompe la publicación.
  try {
    const payloadBase = {
      titulo: esPregunta ? "Nueva pregunta de administración" : "Nuevo aviso",
      cuerpo: titulo,
    }
    await Promise.all([
      audiencias.includes("acomodador")
        ? pushAvisoPersonal(asambleaId, "acomodador", {
            ...payloadBase,
            url: "/acomodador",
          })
        : null,
      audiencias.includes("hermana")
        ? pushAvisoPersonal(asambleaId, "hermana", {
            ...payloadBase,
            url: "/hermana-apoyo",
          })
        : null,
      audiencias.includes("capitan")
        ? pushParaCapitanes(asambleaId, { ...payloadBase, url: "/capitan" })
        : null,
    ])
  } catch {
    /* push opcional */
  }

  revalidatePath("/avisos")
  return { ok: true, error: null }
}

export async function archivarAviso(
  id: string,
): Promise<{ ok: boolean; error: string | null }> {
  const supabase = await createClient()
  const { error } = await supabase
    .from("avisos")
    .update({ archivado: true })
    .eq("id", id)
  if (error) return { ok: false, error: error.message }
  revalidatePath("/avisos")
  return { ok: true, error: null }
}
