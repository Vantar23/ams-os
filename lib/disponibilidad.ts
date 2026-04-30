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

export const DISPONIBILIDAD_SLOTS: readonly DisponibilidadSlot[] =
  DISPONIBILIDAD_DIAS.flatMap((d) =>
    DISPONIBILIDAD_SESIONES.map((s) => `${d.key}-${s.key}` as DisponibilidadSlot),
  )
