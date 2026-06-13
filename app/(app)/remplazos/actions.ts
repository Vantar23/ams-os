"use server"

import { revalidatePath } from "next/cache"

import { pushParaPersona } from "@/lib/push/server"
import { createClient } from "@/lib/supabase/server"

/**
 * Transfiere el puesto (área + sesión) de un acomodador marcado como
 * "necesita_remplazo" a otro acomodador. La fila de asignaciones persiste:
 * cambia el ocupante y se reinicia su estado para que el capitán lo marque de
 * nuevo. Deja registro del cambio (saliente → entrante) en reemplazos.
 */
export async function realizarReemplazo(input: {
  asignacionId: string
  entranteId: string
}): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: "No autenticado" }

  // El puesto a reemplazar; debe estar marcado como necesita_remplazo.
  const { data: pendiente, error: readErr } = await supabase
    .from("asignaciones")
    .select("id, asamblea_id, area_id, slot, acomodador_id, asistencia")
    .eq("id", input.asignacionId)
    .maybeSingle()
  if (readErr) return { error: readErr.message }
  if (!pendiente) return { error: "El puesto ya no existe." }
  if (pendiente.asistencia !== "necesita_remplazo") {
    return { error: "Ese puesto ya no necesita reemplazo." }
  }
  if (pendiente.acomodador_id === input.entranteId) {
    return { error: "Elige un acomodador distinto al que se reemplaza." }
  }

  // Libera al entrante de cualquier otro puesto en este mismo turno para no
  // dejarlo doblemente asignado (mismo criterio que asignarPuesto).
  const { error: delErr } = await supabase
    .from("asignaciones")
    .delete()
    .eq("acomodador_id", input.entranteId)
    .eq("slot", pendiente.slot as string)
  if (delErr) return { error: delErr.message }

  // Transfiere el puesto al entrante y reinicia la asistencia.
  const { error: updErr } = await supabase
    .from("asignaciones")
    .update({
      acomodador_id: input.entranteId,
      asistencia: null,
      asistencia_at: null,
      asistencia_por: null,
      lugares_vacios: null,
      reportado_at: null,
    })
    .eq("id", input.asignacionId)
  if (updErr) return { error: updErr.message }

  const { error: insErr } = await supabase.from("reemplazos").insert({
    asamblea_id: pendiente.asamblea_id,
    area_id: pendiente.area_id,
    slot: pendiente.slot,
    saliente_id: pendiente.acomodador_id,
    entrante_id: input.entranteId,
    realizado_por: user.id,
  })
  if (insErr) return { error: insErr.message }

  // Aviso cordial al acomodador reemplazado. Además del banner que verá en su
  // portal, le mandamos un push si tiene notificaciones activas. Nunca rompe
  // el reemplazo si el push falla.
  try {
    const { data: saliente } = await supabase
      .from("acomodadores")
      .select("nombre, access_token")
      .eq("id", pendiente.acomodador_id)
      .maybeSingle()
    await pushParaPersona(
      pendiente.asamblea_id,
      "acomodador",
      pendiente.acomodador_id,
      {
        titulo: "Gracias por tu servicio 💛",
        cuerpo: `${saliente?.nombre ? `Hola ${saliente.nombre}: ` : ""}como no pudiste estar en tu puesto, otro hermano lo cubrió para no dejar el área sola. Te lo agradecemos de corazón y esperamos verte en tu próximo turno.`,
        url: saliente?.access_token ? `/acomodador/${saliente.access_token}` : "/",
        tag: `reemplazo-${pendiente.id}`,
      },
    )
  } catch {
    /* push opcional */
  }

  revalidatePath("/remplazos")
  revalidatePath("/puestos")
  return { error: null }
}
