"use client"

import * as React from "react"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

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
}

type Props = {
  values: AsambleaFormValues
  onChange: <K extends keyof AsambleaFormValues>(
    key: K,
    value: AsambleaFormValues[K],
  ) => void
}

export function AsambleaFormFields({ values, onChange }: Props) {
  return (
    <div className="space-y-10">
      <section>
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Identidad
        </p>
        <h2 className="mt-2 font-serif text-xl">
          Cómo se llama la asamblea
        </h2>
        <div className="mt-5 space-y-4">
          <div className="grid gap-3 sm:grid-cols-[140px_1fr]">
            <Field label="N° de asamblea" id="numero">
              <Input
                id="numero"
                type="number"
                min={1}
                inputMode="numeric"
                required
                value={values.numero ?? ""}
                onChange={(e) => onChange("numero", e.target.value)}
              />
            </Field>
            <Field label="Edición" id="edicion">
              <Input
                id="edicion"
                required
                value={values.edicion ?? ""}
                onChange={(e) => onChange("edicion", e.target.value)}
              />
            </Field>
          </div>
          <Field
            label="Tema"
            id="titulo"
            hint='Lema de la asamblea, ej. "Manténganse alerta".'
          >
            <Input
              id="titulo"
              required
              value={values.titulo ?? ""}
              onChange={(e) => onChange("titulo", e.target.value)}
            />
          </Field>
        </div>
      </section>

      <section className="border-t border-border pt-10">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Logística
        </p>
        <h2 className="mt-2 font-serif text-xl">Cuándo y dónde</h2>
        <div className="mt-5 space-y-4">
          <Field label="Fechas" id="fechas">
            <Input
              id="fechas"
              required
              value={values.fechas ?? ""}
              onChange={(e) => onChange("fechas", e.target.value)}
            />
          </Field>
          <Field label="Sede" id="sede">
            <Input
              id="sede"
              required
              value={values.sede ?? ""}
              onChange={(e) => onChange("sede", e.target.value)}
            />
          </Field>
          <Field label="Estado" id="estado">
            <Select
              value={values.estado}
              onValueChange={(v) => onChange("estado", v as Estado)}
            >
              <SelectTrigger id="estado">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ESTADOS.map((e) => (
                  <SelectItem key={e} value={e}>
                    {e}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>
      </section>

      <section className="border-t border-border pt-10">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Estructura
        </p>
        <h2 className="mt-2 font-serif text-xl">Días y sesiones</h2>
        <div className="mt-5 space-y-4">
          <div className="grid gap-3 sm:grid-cols-[120px_1fr]">
            <Field label="Días" id="diasCount">
              <Input
                id="diasCount"
                type="number"
                min={1}
                inputMode="numeric"
                required
                value={values.diasCount ?? ""}
                onChange={(e) => onChange("diasCount", e.target.value)}
              />
            </Field>
            <Field label="Detalle de días" id="diasLabel">
              <Input
                id="diasLabel"
                required
                value={values.diasLabel ?? ""}
                onChange={(e) => onChange("diasLabel", e.target.value)}
              />
            </Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-[120px_1fr]">
            <Field label="Sesiones" id="sesionesCount">
              <Input
                id="sesionesCount"
                type="number"
                min={1}
                inputMode="numeric"
                required
                value={values.sesionesCount ?? ""}
                onChange={(e) => onChange("sesionesCount", e.target.value)}
              />
            </Field>
            <Field label="Detalle de sesiones" id="sesionesLabel">
              <Input
                id="sesionesLabel"
                required
                value={values.sesionesLabel ?? ""}
                onChange={(e) => onChange("sesionesLabel", e.target.value)}
              />
            </Field>
          </div>
        </div>
      </section>
    </div>
  )
}

function Field({
  label,
  id,
  hint,
  children,
}: {
  label: string
  id: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="grid gap-1.5">
      <Label
        htmlFor={id}
        className="text-xs uppercase tracking-[0.15em] text-muted-foreground"
      >
        {label}
      </Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}
