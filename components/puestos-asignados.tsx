import { formatDisponibilidad } from "@/lib/export-csv"

export type PuestoAsignado = { areaNombre: string; slot: string }

// Mapa persona_id -> lista de puestos asignados (un puesto por turno).
export type PuestosPorPersona = Record<string, PuestoAsignado[]>

// Agrupa los puestos por área, devolviendo los slots de cada una en orden.
function agruparPorArea(
  items: PuestoAsignado[],
): { areaNombre: string; slots: string[] }[] {
  const byArea = new Map<string, string[]>()
  for (const it of items) {
    const slots = byArea.get(it.areaNombre) ?? []
    slots.push(it.slot)
    byArea.set(it.areaNombre, slots)
  }
  return [...byArea.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([areaNombre, slots]) => ({ areaNombre, slots }))
}

// Texto plano para exportar a Excel/CSV.
export function formatPuestosAsignados(
  items: PuestoAsignado[] | undefined,
): string {
  if (!items || items.length === 0) return ""
  return agruparPorArea(items)
    .map(({ areaNombre, slots }) => `${areaNombre}: ${formatDisponibilidad(slots)}`)
    .join(" · ")
}

export function PuestosAsignadosCell({
  items,
}: {
  items: PuestoAsignado[] | undefined
}) {
  if (!items || items.length === 0) {
    return <span className="text-muted-foreground">—</span>
  }
  const grupos = agruparPorArea(items)
  return (
    <div className="flex flex-col gap-1">
      {grupos.map(({ areaNombre, slots }) => (
        <div key={areaNombre} className="flex flex-col">
          <span className="text-sm font-medium text-foreground">
            {areaNombre}
          </span>
          <span className="text-xs text-muted-foreground">
            {formatDisponibilidad(slots)}
          </span>
        </div>
      ))}
    </div>
  )
}
