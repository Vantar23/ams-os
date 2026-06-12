"use client"

import { ArmchairIcon } from "lucide-react"

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { slotLabelCorto } from "@/lib/disponibilidad"

import type { AsientosArea } from "../load"

function formatReportado(reportadoAt: string | null): string {
  if (!reportadoAt) return ""
  try {
    return new Date(reportadoAt).toLocaleString("es-MX", {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "short",
    })
  } catch {
    return ""
  }
}

/**
 * Desplegable con los asientos disponibles por área del capitán. El encabezado
 * muestra el total libre y, al abrirlo, el detalle área por área tomado del
 * último reporte de cada una.
 */
export function AsientosDisponibles({ areas }: { areas: AsientosArea[] }) {
  if (areas.length === 0) return null

  const conDato = areas.filter((a) => a.disponibles !== null)
  const totalDisponibles = conDato.reduce(
    (sum, a) => sum + (a.disponibles ?? 0),
    0,
  )

  return (
    <Accordion type="single" collapsible className="mt-6">
      <AccordionItem value="asientos">
        <AccordionTrigger>
          <span className="flex flex-1 items-center justify-between gap-3">
            <span className="flex items-center gap-2">
              <ArmchairIcon className="size-5 text-muted-foreground" />
              Asientos disponibles por área
            </span>
            {conDato.length > 0 && (
              <span className="rounded-full border border-primary/40 bg-primary/10 px-2.5 py-0.5 text-xs font-medium tabular-nums text-primary">
                {totalDisponibles} libres
              </span>
            )}
          </span>
        </AccordionTrigger>
        <AccordionContent>
          <ul className="divide-y divide-border">
            {areas.map((a) => {
              const sinCapacidad = a.capacidad === 0
              const sinReporte = a.disponibles === null && !sinCapacidad
              return (
                <li
                  key={a.areaId}
                  className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-foreground">{a.nombre}</p>
                    <p className="text-xs text-muted-foreground">
                      {a.piso}
                      {a.slot && ` · ${slotLabelCorto(a.slot)}`}
                      {a.reportadoAt &&
                        ` · ${formatReportado(a.reportadoAt)}`}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    {sinCapacidad ? (
                      <span className="text-xs text-muted-foreground">
                        Sin capacidad fija
                      </span>
                    ) : sinReporte ? (
                      <span className="text-xs text-muted-foreground">
                        Sin reporte
                      </span>
                    ) : (
                      <p className="text-xl font-semibold tabular-nums text-foreground">
                        {a.disponibles}
                        <span className="ml-1 text-xs font-normal text-muted-foreground">
                          de {a.capacidad}
                        </span>
                      </p>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  )
}
