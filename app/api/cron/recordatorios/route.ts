// Avisos de turno disparados por pg_cron cada minuto (vía pg_net). En cada
// tick decidimos, según la hora local del recinto, si toca enviar:
//   - Recordatorio a acomodadores y hermanas con puesto, 20 min ANTES del
//     inicio de la sesión.
//   - Aviso "pasa lista" a los capitanes con equipo, AL INICIO de la sesión.
// La tabla recordatorios_turno (asamblea_id, slot, fecha, tipo) evita repetir
// cada aviso. Los capitanes no tienen push: su aviso es un mensaje admin→capitán
// que ven en /capitan/mensajes (badge de no leídos).

import { parseFechas } from "@/lib/asamblea"
import { pushParaPersona } from "@/lib/push/server"
import { createAdminClient } from "@/lib/supabase/admin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const TZ_RECINTO = "America/Mexico_City"
// Minutos antes del inicio en que se avisa a los acomodadores.
const ANTICIPACION_MIN = 20
// Ventana de tolerancia por si el cron se retrasa; el control de duplicados
// garantiza que cada aviso se envíe una sola vez por sesión y día.
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

function enVentana(ahora: number, objetivo: number): boolean {
  return ahora >= objetivo && ahora < objetivo + VENTANA_MIN
}

const first = <T,>(v: T | T[] | null | undefined): T | null =>
  Array.isArray(v) ? (v[0] ?? null) : (v ?? null)

type Admin = ReturnType<typeof createAdminClient>

/**
 * Marca el aviso como enviado para (asamblea, slot, fecha, tipo). Devuelve true
 * solo si esta llamada lo registró (no existía); false si ya estaba (otro tick).
 */
async function registrarEnvio(
  admin: Admin,
  asambleaId: string,
  slot: string,
  fecha: string,
  tipo: "acomodadores" | "capitanes",
): Promise<boolean> {
  const { error } = await admin
    .from("recordatorios_turno")
    .insert({ asamblea_id: asambleaId, slot, fecha, tipo })
  if (!error) return true
  if (error.code === "23505") return false // ya enviado
  throw new Error(`dedupe ${tipo} ${slot}: ${error.message}`)
}

/** Recordatorio a acomodadores y hermanas con puesto en el turno. */
async function avisarPersonal(
  admin: Admin,
  asambleaId: string,
  slot: string,
  sesion: "manana" | "tarde",
): Promise<number> {
  const cuerpo = `Tu turno ${SESION_LABEL[sesion]} empieza pronto. Por favor, preséntate ${ANTICIPACION_MIN} minutos antes del inicio del programa.`
  let enviados = 0

  const { data: asgAcom } = await admin
    .from("asignaciones")
    .select("acomodador_id, acomodadores(access_token)")
    .eq("asamblea_id", asambleaId)
    .eq("slot", slot)
  const vistosAcom = new Set<string>()
  for (const r of (asgAcom ?? []) as {
    acomodador_id: string
    acomodadores: { access_token: string | null } | { access_token: string | null }[] | null
  }[]) {
    if (vistosAcom.has(r.acomodador_id)) continue
    vistosAcom.add(r.acomodador_id)
    const token = first(r.acomodadores)?.access_token ?? null
    await pushParaPersona(asambleaId, "acomodador", r.acomodador_id, {
      titulo: "Recordatorio de turno",
      cuerpo,
      url: token ? `/acomodador/${token}` : "/",
      tag: `recordatorio-${slot}`,
    })
    enviados++
  }

  const { data: asgHerm } = await admin
    .from("asignaciones_hermanas")
    .select("hermana_apoyo_id, hermanas_apoyo(access_token)")
    .eq("asamblea_id", asambleaId)
    .eq("slot", slot)
  const vistosHerm = new Set<string>()
  for (const r of (asgHerm ?? []) as {
    hermana_apoyo_id: string
    hermanas_apoyo: { access_token: string | null } | { access_token: string | null }[] | null
  }[]) {
    if (vistosHerm.has(r.hermana_apoyo_id)) continue
    vistosHerm.add(r.hermana_apoyo_id)
    const token = first(r.hermanas_apoyo)?.access_token ?? null
    await pushParaPersona(asambleaId, "hermana", r.hermana_apoyo_id, {
      titulo: "Recordatorio de turno",
      cuerpo,
      url: token ? `/hermana-apoyo/${token}` : "/",
      tag: `recordatorio-${slot}`,
    })
    enviados++
  }

  return enviados
}

/**
 * Aviso "pasa lista" a los capitanes que tienen al menos un acomodador con
 * puesto en este turno. Es un mensaje admin→capitán (los capitanes no tienen
 * push); aparece en /capitan/mensajes con badge de no leídos.
 */
async function avisarCapitanes(
  admin: Admin,
  asambleaId: string,
  slot: string,
  sesion: "manana" | "tarde",
): Promise<number> {
  // Áreas con acomodadores asignados en este turno.
  const { data: asg } = await admin
    .from("asignaciones")
    .select("area_id")
    .eq("asamblea_id", asambleaId)
    .eq("slot", slot)
  const areaIdsConEquipo = new Set(
    ((asg ?? []) as { area_id: string }[]).map((a) => a.area_id),
  )
  if (areaIdsConEquipo.size === 0) return 0

  // Etiqueta "piso — nombre" de esas áreas (así se guardan en capitanes.area).
  const { data: areas } = await admin
    .from("areas")
    .select("id, piso, nombre")
    .eq("asamblea_id", asambleaId)
  const labelsConEquipo = new Set(
    ((areas ?? []) as { id: string; piso: string; nombre: string }[])
      .filter((a) => areaIdsConEquipo.has(a.id))
      .map((a) => `${a.piso} — ${a.nombre}`),
  )

  const { data: capitanes } = await admin
    .from("capitanes")
    .select("id, area")
    .eq("asamblea_id", asambleaId)
  const objetivo = ((capitanes ?? []) as { id: string; area: string[] | null }[]).filter(
    (c) => (c.area ?? []).some((label) => labelsConEquipo.has(label)),
  )
  if (objetivo.length === 0) return 0

  const cuerpo = `Ya inició el turno ${SESION_LABEL[sesion]}. Por favor pasa lista de tus acomodadores en “Pase de lista”: marca quién llegó y quién necesita reemplazo.`
  const { error } = await admin.from("mensajes").insert(
    objetivo.map((c) => ({
      asamblea_id: asambleaId,
      persona_tipo: "capitan",
      persona_id: c.id,
      remitente: "admin",
      admin_user_id: null,
      cuerpo,
    })),
  )
  if (error) throw new Error(`mensajes capitanes ${slot}: ${error.message}`)
  return objetivo.length
}

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

  const detalle: string[] = []
  let enviados = 0

  for (const { sesion, inicio } of sesiones) {
    if (inicio === null) continue
    const slot = `${dia}-${sesion}`

    // Acomodadores y hermanas: 20 min antes del inicio.
    if (enVentana(minutos, inicio - ANTICIPACION_MIN)) {
      if (await registrarEnvio(admin, asamblea.id, slot, fecha, "acomodadores")) {
        const n = await avisarPersonal(admin, asamblea.id, slot, sesion)
        enviados += n
        detalle.push(`personal ${slot}: ${n}`)
      }
    }

    // Capitanes: al inicio del turno, para que pasen lista.
    if (enVentana(minutos, inicio)) {
      if (await registrarEnvio(admin, asamblea.id, slot, fecha, "capitanes")) {
        const n = await avisarCapitanes(admin, asamblea.id, slot, sesion)
        enviados += n
        detalle.push(`capitanes ${slot}: ${n}`)
      }
    }
  }

  return Response.json({ ok: true, enviados, dia, fecha, detalle })
}

export async function POST(request: Request): Promise<Response> {
  return manejar(request)
}

export async function GET(request: Request): Promise<Response> {
  return manejar(request)
}
