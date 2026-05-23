import {
  DISPONIBILIDAD_DIAS,
  DISPONIBILIDAD_SESIONES,
  type DisponibilidadSlot,
} from "@/lib/disponibilidad"

function escapeCell(value: unknown): string {
  if (value === null || value === undefined) return ""
  const str = String(value)
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

export function rowsToCsv(headers: string[], rows: (string | number | null | undefined)[][]): string {
  const lines = [headers.map(escapeCell).join(",")]
  for (const row of rows) {
    lines.push(row.map(escapeCell).join(","))
  }
  return lines.join("\r\n")
}

export function downloadCsv(filename: string, csv: string): void {
  const bom = "﻿"
  const blob = new Blob([bom + csv], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.setAttribute("download", filename)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

const DIA_LABEL: Record<string, string> = Object.fromEntries(
  DISPONIBILIDAD_DIAS.map((d) => [d.key, d.label]),
)
const SESION_LABEL: Record<string, string> = Object.fromEntries(
  DISPONIBILIDAD_SESIONES.map((s) => [s.key, s.label.toLowerCase()]),
)

export function formatDisponibilidad(slots: readonly string[] | null | undefined): string {
  if (!slots || slots.length === 0) return ""
  const order = new Map<string, number>()
  let i = 0
  for (const d of DISPONIBILIDAD_DIAS) {
    for (const s of DISPONIBILIDAD_SESIONES) {
      order.set(`${d.key}-${s.key}`, i++)
    }
  }
  const sorted = [...slots].sort(
    (a, b) => (order.get(a) ?? 999) - (order.get(b) ?? 999),
  )
  return sorted
    .map((slot) => {
      const [dia, sesion] = (slot as DisponibilidadSlot).split("-")
      return `${DIA_LABEL[dia] ?? dia} ${SESION_LABEL[sesion] ?? sesion}`
    })
    .join("; ")
}

export function todayStamp(): string {
  const d = new Date()
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, "0")
  const dd = String(d.getDate()).padStart(2, "0")
  return `${yyyy}-${mm}-${dd}`
}
