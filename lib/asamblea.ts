export const ESTADOS = [
  "En preparación",
  "Confirmada",
  "En curso",
  "Finalizada",
] as const
export type Estado = (typeof ESTADOS)[number]

export type AsambleaFormValues = {
  numero: string
  edicion: string
  titulo: string
  fechas: string
  sede: string
  estado: Estado
  diasCount: string
  diasLabel: string
  sesionesCount: string
  sesionesLabel: string
  whatsappGrupoUrl: string
}

export const INITIAL_ASAMBLEA: AsambleaFormValues = {
  numero: "1",
  edicion: "Asamblea Regional 2026",
  titulo: "Manténganse alerta",
  fechas: "2 al 4 de octubre, 2026",
  sede: "Centro de Convenciones — Ciudad de México",
  estado: "En preparación",
  diasCount: "3",
  diasLabel: "Vie · Sáb · Dom",
  sesionesCount: "6",
  sesionesLabel: "Mañana y tarde",
  whatsappGrupoUrl: "",
}

export const EMPTY_ASAMBLEA: AsambleaFormValues = {
  numero: "",
  edicion: "",
  titulo: "",
  fechas: "",
  sede: "",
  estado: "En preparación",
  diasCount: "",
  diasLabel: "",
  sesionesCount: "",
  sesionesLabel: "",
  whatsappGrupoUrl: "",
}
