export const DISPONIBILIDAD_DIAS = [
  { key: "viernes", label: "Viernes" },
  { key: "sabado", label: "Sábado" },
  { key: "domingo", label: "Domingo" },
] as const

export const DISPONIBILIDAD_SESIONES = [
  { key: "manana", label: "Mañana" },
  { key: "tarde", label: "Tarde" },
] as const

export type DisponibilidadDia = (typeof DISPONIBILIDAD_DIAS)[number]["key"]
export type DisponibilidadSesion = (typeof DISPONIBILIDAD_SESIONES)[number]["key"]
export type DisponibilidadSlot = `${DisponibilidadDia}-${DisponibilidadSesion}`

/**
 * Día y turno sugeridos según la fecha/hora actuales. Sáb→sabado, Dom→domingo,
 * cualquier otro día→viernes (inicio de la asamblea). Antes de las 12 h→mañana.
 */
export function currentDiaSesion(now: Date = new Date()): {
  dia: DisponibilidadDia
  sesion: DisponibilidadSesion
} {
  const day = now.getDay() // 0=Dom, 5=Vie, 6=Sáb
  const dia: DisponibilidadDia =
    day === 6 ? "sabado" : day === 0 ? "domingo" : "viernes"
  const sesion: DisponibilidadSesion = now.getHours() < 12 ? "manana" : "tarde"
  return { dia, sesion }
}

export const DISPONIBILIDAD_SLOTS: readonly DisponibilidadSlot[] =
  DISPONIBILIDAD_DIAS.flatMap((d) =>
    DISPONIBILIDAD_SESIONES.map((s) => `${d.key}-${s.key}` as DisponibilidadSlot),
  )

// Hora local del recinto de la asamblea.
const TZ_RECINTO = "America/Mexico_City"

export type MomentoRecinto = {
  // Día de asamblea en curso, o null si hoy no es vie/sáb/dom.
  dia: DisponibilidadDia | null
  hora: number
}

const WEEKDAY_A_DIA: Record<string, DisponibilidadDia> = {
  Fri: "viernes",
  Sat: "sabado",
  Sun: "domingo",
}

export function momentoEnRecinto(ahora: Date = new Date()): MomentoRecinto {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ_RECINTO,
    weekday: "short",
    hour: "numeric",
    hourCycle: "h23",
  }).formatToParts(ahora)
  const weekday = parts.find((p) => p.type === "weekday")?.value ?? ""
  const hora = Number(parts.find((p) => p.type === "hour")?.value ?? "0")
  return { dia: WEEKDAY_A_DIA[weekday] ?? null, hora }
}

// Qué puestos mostrarle a la persona según la hora del recinto:
// - Durante el día de asamblea, la sesión de la mañana es visible hasta las
//   14:00 y la de la tarde desde las 12:00 (entre 12 y 14 se ven ambas).
// - Fuera de esas ventanas (o antes de la asamblea) se muestra solo el
//   siguiente puesto asignado.
export function slotsVisibles(
  asignados: readonly string[],
  momento: MomentoRecinto,
): string[] {
  const slots = DISPONIBILIDAD_SLOTS.filter((s) => asignados.includes(s))
  const diaIdx = (d: string) =>
    DISPONIBILIDAD_DIAS.findIndex((x) => x.key === d)
  const hoy = momento.dia ? diaIdx(momento.dia) : -1

  const enVentana = slots.filter((slot) => {
    const [d, sesion] = slot.split("-")
    if (diaIdx(d) !== hoy) return false
    return sesion === "manana" ? momento.hora < 14 : momento.hora >= 12
  })
  if (enVentana.length > 0) return enVentana

  const proximo = slots.find((slot) => {
    const [d, sesion] = slot.split("-")
    const di = diaIdx(d)
    if (di !== hoy) return di > hoy
    const inicio = sesion === "manana" ? 0 : 12
    return inicio > momento.hora
  })
  return proximo ? [proximo] : []
}

export function slotLabelCorto(slot: string): string {
  const [d, s] = slot.split("-")
  const dia = DISPONIBILIDAD_DIAS.find((x) => x.key === d)?.label ?? d
  const sesion =
    DISPONIBILIDAD_SESIONES.find((x) => x.key === s)?.label.toLowerCase() ?? s
  return `${dia.slice(0, 3)} ${sesion}`
}
