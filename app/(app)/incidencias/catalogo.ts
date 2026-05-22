export const TIPOS_INCIDENCIA = [
  "Médica",
  "Persona perdida",
  "Niño extraviado",
  "Bloqueo de paso",
  "Estacionamiento",
  "Limpieza o derrame",
  "Acceso o entrada",
  "Ruido o interrupción",
  "Otro",
] as const

export type EstadoIncidencia = "pendiente" | "en_proceso" | "resuelto"

export const ESTADO_LABEL: Record<EstadoIncidencia, string> = {
  pendiente: "Pendiente",
  en_proceso: "En proceso",
  resuelto: "Resuelto",
}
