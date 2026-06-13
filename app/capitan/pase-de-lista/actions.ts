"use server"

import { revalidatePath } from "next/cache"

import { pushParaAdmins } from "@/lib/push/server"
import { createClient } from "@/lib/supabase/server"

const ERROR_LABEL: Record<string, string> = {
  not_capitan: "Tu sesión no está vinculada a un capitán.",
  invalid_estado: "Estado de asistencia no válido.",
  area_no_asignada: "Ese puesto no está en una de tus áreas.",
}

const first = <T,>(v: T | T[] | null | undefined): T | null =>
  Array.isArray(v) ? (v[0] ?? null) : (v ?? null)

export async function marcarAsistencia(input: {
  asignacionId: string
  estado: "presente" | "necesita_remplazo" | "cancelar"
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

  // Aviso en tiempo real a administración cuando un puesto queda sin cubrir.
  // El push es opcional: nunca rompe el marcado si falla.
  if (input.estado === "necesita_remplazo") {
    try {
      const { data: asig } = await supabase
        .from("asignaciones")
        .select(
          "asamblea_id, areas(piso, nombre), acomodadores(nombre, apellido)",
        )
        .eq("id", input.asignacionId)
        .maybeSingle()
      const asambleaId = (asig as { asamblea_id?: string } | null)?.asamblea_id
      if (asambleaId) {
        const area = first(
          (asig as { areas?: unknown }).areas as
            | { piso: string; nombre: string }
            | { piso: string; nombre: string }[]
            | null,
        )
        const ac = first(
          (asig as { acomodadores?: unknown }).acomodadores as
            | { nombre: string; apellido: string }
            | { nombre: string; apellido: string }[]
            | null,
        )
        const detalle = [
          ac ? `${ac.nombre} ${ac.apellido}`.trim() : null,
          area ? `${area.piso} — ${area.nombre}` : null,
        ]
          .filter(Boolean)
          .join(" · ")
        await pushParaAdmins(asambleaId, {
          titulo: "Puesto necesita reemplazo",
          cuerpo: detalle || "Un acomodador necesita reemplazo.",
          url: "/remplazos",
          tag: `remplazo-${input.asignacionId}`,
        })
      }
    } catch {
      /* push opcional */
    }
  }

  revalidatePath("/capitan/pase-de-lista")
  revalidatePath("/remplazos")
  return { ok: true, error: null }
}
