export const DESPERFECTOS_RECEPCION = [
  "Silla rota",
  "Banca dañada",
  "Foco fundido",
  "Lámpara fallando",
  "Micrófono fallando",
  "Bocina / audio fallando",
  "Pantalla / proyector fallando",
  "Cable suelto / peligroso",
  "Aire acondicionado fallando",
  "Ventilador fallando",
  "Baño sin agua",
  "Baño con fuga",
  "Lavabo / llave fallando",
  "Puerta atorada",
  "Cerradura dañada",
  "Vidrio roto",
  "Gotera / humedad",
  "Limpieza pendiente",
  "Cancel / barda dañada",
  "Otro",
] as const

export type EstadoRecepcion = "pendiente" | "en_proceso" | "resuelto"

export const ESTADO_LABEL: Record<EstadoRecepcion, string> = {
  pendiente: "Pendiente",
  en_proceso: "En proceso",
  resuelto: "Resuelto",
}
