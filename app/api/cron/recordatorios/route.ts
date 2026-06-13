// Recordatorio de turno: lo dispara pg_cron cada minuto (vía pg_net) y aquí
// decidimos si estamos en la ventana de "20 min antes del inicio" de alguna
// sesión de hoy. Si sí, avisamos a acomodadores y hermanas con puesto en ese
// turno. La tabla recordatorios_turno evita repetir el aviso.

import { parseFechas } from "@/lib/asamblea"
import { pushParaPersona } from "@/lib/push/server"
import { createAdminClient } from "@/lib/supabase/admin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const TZ_RECINTO = "America/Mexico_City"
// Minutos antes del inicio en que se envía el recordatorio.
const ANTICIPACION_MIN = 20
// Ventana de tolerancia por si el cron se retrasa; el control de duplicados
// garantiza que solo se envíe una vez por sesión y día.
const VENTANA_MIN = 15

const DIA_POR_WEEKDAY: Record<number, "viernes" | "sabado" | "domingo"> = {
  5: "viernes",
  6: "sabado",
  0: "domingo",
}

const SESION_LABEL: Record<string, string> = {
  manana: "de la mañana",
  tarde: "de la tarde",
}

function momentoMX(): { fecha: string; minutos: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ_RECINTO,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date())
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? ""
  const fecha = `${get("year")}-${get("month")}-${get("day")}`
  const minutos = Number(get("hour")) * 60 + Number(get("minute"))
  return { fecha, minutos }
}

function ymd(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

/** Día de asamblea (viernes/sabado/domingo) si hoy cae dentro del rango. */
function diaDeHoy(fechas: string, hoy: string): "viernes" | "sabado" | "domingo" | null {
  const rango = parseFechas(fechas)
  if (!rango) return null
  const fin = rango.to ?? rango.from
  const cursor = new Date(rango.from)
  while (cursor <= fin) {
    if (ymd(cursor) === hoy) {
      return DIA_POR_WEEKDAY[cursor.getDay()] ?? null
    }
    cursor.setDate(cursor.getDate() + 1)
  }
  return null
}

function minutosDeHora(hora: string | null): number | null {
  if (!hora) return null
  const m = hora.match(/^(\d{1,2}):(\d{2})/)
  if (!m) return null
  return Number(m[1]) * 60 + Number(m[2])
}

const first = <T,>(v: T | T[] | null | undefined): T | null =>
  Array.isArray(v) ? (v[0] ?? null) : (v ?? null)

async function manejar(request: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    return Response.json({ error: "CRON_SECRET no configurado" }, { status: 500 })
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "No autorizado" }, { status: 401 })
  }

  const admin = createAdminClient()
  const { data: asambleas } = await admin
    .from("asambleas")
    .select("id, fechas, hora_inicio_manana, hora_inicio_tarde")
    .order("created_at", { ascending: false })
    .limit(1)
  const asamblea = asambleas?.[0] as
    | {
        id: string
        fechas: string | null
        hora_inicio_manana: string | null
        hora_inicio_tarde: string | null
      }
    | undefined
  if (!asamblea) return Response.json({ ok: true, enviados: 0, motivo: "sin asamblea" })

  const { fecha, minutos } = momentoMX()
  const dia = diaDeHoy(asamblea.fechas ?? "", fecha)
  if (!dia) return Response.json({ ok: true, enviados: 0, motivo: "hoy no es día de asamblea" })

  const sesiones: { sesion: "manana" | "tarde"; inicio: number | null }[] = [
    { sesion: "manana", inicio: minutosDeHora(asamblea.hora_inicio_manana) },
    { sesion: "tarde", inicio: minutosDeHora(asamblea.hora_inicio_tarde) },
  ]

  let enviados = 0
  const detalle: string[] = []

  for (const { sesion, inicio } of sesiones) {
    if (inicio === null) continue
    const objetivo = inicio - ANTICIPACION_MIN
    if (minutos < objetivo || minutos >= objetivo + VENTANA_MIN) continue

    const slot = `${dia}-${sesion}`

    // Control de duplicados: si la fila ya existe, otro tick ya envió.
    const { error: dupErr } = await admin
      .from("recordatorios_turno")
      .insert({ asamblea_id: asamblea.id, slot, fecha })
    if (dupErr) {
      // 23505 = unique_violation → ya se envió esta sesión hoy.
      if (dupErr.code === "23505") continue
      detalle.push(`error dedupe ${slot}: ${dupErr.message}`)
      continue
    }

    const cuerpo = `Tu turno ${SESION_LABEL[sesion]} empieza pronto. Por favor, preséntate ${ANTICIPACION_MIN} minutos antes del inicio del programa.`

    // Acomodadores con puesto en este turno.
    const { data: asgAcom } = await admin
      .from("asignaciones")
      .select("acomodador_id, acomodadores(access_token)")
      .eq("asamblea_id", asamblea.id)
      .eq("slot", slot)
    const vistosAcom = new Set<string>()
    for (const r of (asgAcom ?? []) as {
      acomodador_id: string
      acomodadores: { access_token: string | null } | { access_token: string | null }[] | null
    }[]) {
      if (vistosAcom.has(r.acomodador_id)) continue
      vistosAcom.add(r.acomodador_id)
      const token = first(r.acomodadores)?.access_token ?? null
      await pushParaPersona(asamblea.id, "acomodador", r.acomodador_id, {
        titulo: "Recordatorio de turno",
        cuerpo,
        url: token ? `/acomodador/${token}` : "/",
        tag: `recordatorio-${slot}`,
      })
      enviados++
    }

    // Hermanas de apoyo con puesto en este turno.
    const { data: asgHerm } = await admin
      .from("asignaciones_hermanas")
      .select("hermana_apoyo_id, hermanas_apoyo(access_token)")
      .eq("asamblea_id", asamblea.id)
      .eq("slot", slot)
    const vistosHerm = new Set<string>()
    for (const r of (asgHerm ?? []) as {
      hermana_apoyo_id: string
      hermanas_apoyo: { access_token: string | null } | { access_token: string | null }[] | null
    }[]) {
      if (vistosHerm.has(r.hermana_apoyo_id)) continue
      vistosHerm.add(r.hermana_apoyo_id)
      const token = first(r.hermanas_apoyo)?.access_token ?? null
      await pushParaPersona(asamblea.id, "hermana", r.hermana_apoyo_id, {
        titulo: "Recordatorio de turno",
        cuerpo,
        url: token ? `/hermana-apoyo/${token}` : "/",
        tag: `recordatorio-${slot}`,
      })
      enviados++
    }

    detalle.push(`${slot}: ${vistosAcom.size + vistosHerm.size} personas`)
  }

  return Response.json({ ok: true, enviados, dia, fecha, detalle })
}

export async function POST(request: Request): Promise<Response> {
  return manejar(request)
}

export async function GET(request: Request): Promise<Response> {
  return manejar(request)
}
