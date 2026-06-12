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
  primerosAuxiliosTelefono: string
  seguridadTelefono: string
  limpiezaTelefono: string
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
  primerosAuxiliosTelefono: "",
  seguridadTelefono: "",
  limpiezaTelefono: "",
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
  primerosAuxiliosTelefono: "",
  seguridadTelefono: "",
  limpiezaTelefono: "",
}

const MESES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
]

export type FechasRange = { from: Date; to?: Date }

export function formatFechas({ from, to }: FechasRange): string {
  const d1 = from.getDate()
  const m1 = MESES[from.getMonth()]
  const y1 = from.getFullYear()
  if (!to || to.toDateString() === from.toDateString()) {
    return `${d1} de ${m1}, ${y1}`
  }
  const d2 = to.getDate()
  const m2 = MESES[to.getMonth()]
  const y2 = to.getFullYear()
  if (y1 !== y2) return `${d1} de ${m1}, ${y1} al ${d2} de ${m2}, ${y2}`
  if (m1 !== m2) return `${d1} de ${m1} al ${d2} de ${m2}, ${y1}`
  return `${d1} al ${d2} de ${m1}, ${y1}`
}

const DIAS_SEMANA = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"]

const MS_POR_DIA = 86_400_000

export type EstructuraDerivada = Pick<
  AsambleaFormValues,
  "diasCount" | "diasLabel" | "sesionesCount" | "sesionesLabel"
>

export function deriveEstructura({ from, to }: FechasRange): EstructuraDerivada {
  const fin = to && to >= from ? to : from
  const count = Math.round((fin.getTime() - from.getTime()) / MS_POR_DIA) + 1
  let diasLabel: string
  if (count > 7) {
    diasLabel = `${DIAS_SEMANA[from.getDay()]} a ${DIAS_SEMANA[fin.getDay()]}`
  } else {
    const dias: string[] = []
    const cursor = new Date(from)
    for (let i = 0; i < count; i++) {
      dias.push(DIAS_SEMANA[cursor.getDay()])
      cursor.setDate(cursor.getDate() + 1)
    }
    diasLabel = dias.join(" · ")
  }
  return {
    diasCount: String(count),
    diasLabel,
    sesionesCount: String(count * 2),
    sesionesLabel: "Mañana y tarde",
  }
}

function mesIndex(nombre: string): number {
  return MESES.indexOf(nombre.toLowerCase())
}

export function parseFechas(texto: string): FechasRange | undefined {
  const s = texto.trim()
  let m = s.match(/^(\d{1,2}) al (\d{1,2}) de ([a-zá-ú]+),? (\d{4})$/i)
  if (m) {
    const mes = mesIndex(m[3])
    if (mes < 0) return undefined
    return {
      from: new Date(+m[4], mes, +m[1]),
      to: new Date(+m[4], mes, +m[2]),
    }
  }
  m = s.match(/^(\d{1,2}) de ([a-zá-ú]+) al (\d{1,2}) de ([a-zá-ú]+),? (\d{4})$/i)
  if (m) {
    const mes1 = mesIndex(m[2])
    const mes2 = mesIndex(m[4])
    if (mes1 < 0 || mes2 < 0) return undefined
    return {
      from: new Date(+m[5], mes1, +m[1]),
      to: new Date(+m[5], mes2, +m[3]),
    }
  }
  m = s.match(
    /^(\d{1,2}) de ([a-zá-ú]+),? (\d{4}) al (\d{1,2}) de ([a-zá-ú]+),? (\d{4})$/i,
  )
  if (m) {
    const mes1 = mesIndex(m[2])
    const mes2 = mesIndex(m[5])
    if (mes1 < 0 || mes2 < 0) return undefined
    return {
      from: new Date(+m[3], mes1, +m[1]),
      to: new Date(+m[6], mes2, +m[4]),
    }
  }
  m = s.match(/^(\d{1,2}) de ([a-zá-ú]+),? (\d{4})$/i)
  if (m) {
    const mes = mesIndex(m[2])
    if (mes < 0) return undefined
    const dia = new Date(+m[3], mes, +m[1])
    return { from: dia, to: dia }
  }
  return undefined
}
