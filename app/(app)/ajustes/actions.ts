"use server"

import { revalidatePath } from "next/cache"

import { createClient } from "@/lib/supabase/server"
import { ESTADOS, type AsambleaFormValues } from "@/lib/asamblea"
import { isValidPhone, normalizePhone, TELEFONO_INVALIDO_MSG } from "@/lib/phone"

export async function actualizarAsamblea(
  values: AsambleaFormValues,
): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: "No autenticado" }

  const { data: asambleas } = await supabase
    .from("asambleas")
    .select("id")
    .order("created_at", { ascending: false })
    .limit(1)
  const asambleaId = asambleas?.[0]?.id as string | undefined
  if (!asambleaId) return { error: "Sin asamblea" }

  const { data: miembro } = await supabase
    .from("asamblea_miembros")
    .select("role")
    .eq("asamblea_id", asambleaId)
    .eq("user_id", user.id)
    .maybeSingle()
  if (miembro?.role !== "owner") return { error: "Sin permiso" }

  const numero = values.numero.trim()
  const edicion = values.edicion.trim()
  const titulo = values.titulo.trim()
  const fechas = values.fechas.trim()
  const sede = values.sede.trim()
  const diasLabel = values.diasLabel.trim()
  const sesionesLabel = values.sesionesLabel.trim()
  const whatsappGrupoUrl = values.whatsappGrupoUrl.trim()

  if (!numero) return { error: "Falta el número de asamblea." }
  if (!edicion) return { error: "Falta la edición." }
  if (!titulo) return { error: "Falta el tema." }
  if (!fechas) return { error: "Faltan las fechas." }
  if (!sede) return { error: "Falta la sede." }
  if (!ESTADOS.includes(values.estado)) return { error: "Estado inválido." }

  const diasCount = Number(values.diasCount)
  const sesionesCount = Number(values.sesionesCount)
  if (!Number.isFinite(diasCount) || diasCount < 1) {
    return { error: "Número de días inválido." }
  }
  if (!Number.isFinite(sesionesCount) || sesionesCount < 1) {
    return { error: "Número de sesiones inválido." }
  }
  if (!diasLabel) return { error: "Falta el detalle de días." }
  if (!sesionesLabel) return { error: "Falta el detalle de sesiones." }

  if (whatsappGrupoUrl) {
    try {
      const url = new URL(whatsappGrupoUrl)
      if (url.protocol !== "https:") {
        return { error: "El enlace de WhatsApp debe usar https://" }
      }
    } catch {
      return { error: "Enlace de WhatsApp inválido." }
    }
  }

  const primerosAuxilios = normalizePhone(values.primerosAuxiliosTelefono)
  if (primerosAuxilios && !isValidPhone(primerosAuxilios)) {
    return { error: `Primeros auxilios: ${TELEFONO_INVALIDO_MSG}` }
  }

  const { error } = await supabase
    .from("asambleas")
    .update({
      numero,
      edicion,
      titulo,
      fechas,
      sede,
      estado: values.estado,
      dias_count: diasCount,
      dias_label: diasLabel,
      sesiones_count: sesionesCount,
      sesiones_label: sesionesLabel,
      whatsapp_grupo_url: whatsappGrupoUrl || null,
      primeros_auxilios_telefono: primerosAuxilios || null,
    })
    .eq("id", asambleaId)

  if (error) return { error: error.message }

  revalidatePath("/ajustes")
  revalidatePath("/resumen")
  return { error: null }
}
