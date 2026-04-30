"use client"

import * as React from "react"
import { CheckIcon } from "lucide-react"

import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const ESTADOS = [
  "En preparación",
  "Confirmada",
  "En curso",
  "Finalizada",
] as const
type Estado = (typeof ESTADOS)[number]

type AjustesState = {
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

const INITIAL: AjustesState = {
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

export default function AjustesPage() {
  const [values, setValues] = React.useState<AjustesState>(INITIAL)
  const [saved, setSaved] = React.useState<AjustesState>(INITIAL)
  const [showSaved, setShowSaved] = React.useState(false)

  const dirty = React.useMemo(
    () => JSON.stringify(values) !== JSON.stringify(saved),
    [values, saved]
  )

  function update<K extends keyof AjustesState>(k: K, v: AjustesState[K]) {
    setValues((s) => ({ ...s, [k]: v }))
    setShowSaved(false)
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaved(values)
    setShowSaved(true)
  }

  function onReset() {
    setValues(saved)
    setShowSaved(false)
  }

  return (
    <>
      <PageHeader parent="Configuración" title="Ajustes" />
      <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 lg:px-10">
        <header>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Configuración
          </p>
          <h1 className="mt-2 font-serif text-3xl text-foreground">
            Ajustes de la asamblea
          </h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            Información que aparece en el resumen y los reportes generados.
          </p>
        </header>

        <form onSubmit={onSubmit} className="mt-10 space-y-10">
          <section>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Identidad
            </p>
            <h2 className="mt-2 font-serif text-xl">
              Cómo se llama la asamblea
            </h2>
            <div className="mt-5 space-y-4">
              <Field label="Edición" id="edicion">
                <Input
                  id="edicion"
                  value={values.edicion}
                  onChange={(e) => update("edicion", e.target.value)}
                />
              </Field>
              <Field
                label="Tema"
                id="titulo"
                hint='Lema de la asamblea, ej. "Manténganse alerta".'
              >
                <Input
                  id="titulo"
                  value={values.titulo}
                  onChange={(e) => update("titulo", e.target.value)}
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
                  value={values.fechas}
                  onChange={(e) => update("fechas", e.target.value)}
                />
              </Field>
              <Field label="Sede" id="sede">
                <Input
                  id="sede"
                  value={values.sede}
                  onChange={(e) => update("sede", e.target.value)}
                />
              </Field>
              <Field label="Estado" id="estado">
                <Select
                  value={values.estado}
                  onValueChange={(v) => update("estado", v as Estado)}
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
                    value={values.diasCount}
                    onChange={(e) => update("diasCount", e.target.value)}
                  />
                </Field>
                <Field label="Detalle de días" id="diasLabel">
                  <Input
                    id="diasLabel"
                    value={values.diasLabel}
                    onChange={(e) => update("diasLabel", e.target.value)}
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
                    value={values.sesionesCount}
                    onChange={(e) => update("sesionesCount", e.target.value)}
                  />
                </Field>
                <Field label="Detalle de sesiones" id="sesionesLabel">
                  <Input
                    id="sesionesLabel"
                    value={values.sesionesLabel}
                    onChange={(e) =>
                      update("sesionesLabel", e.target.value)
                    }
                  />
                </Field>
              </div>
            </div>
          </section>

          <div className="flex flex-col-reverse items-stretch gap-3 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs uppercase tracking-[0.15em] text-muted-foreground">
              {showSaved ? (
                <span className="inline-flex items-center gap-1.5 text-foreground">
                  <CheckIcon className="size-3.5" /> Cambios guardados
                </span>
              ) : dirty ? (
                "Cambios sin guardar"
              ) : (
                "Sin cambios"
              )}
            </p>
            <div className="flex gap-2 sm:gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={onReset}
                disabled={!dirty}
              >
                Descartar
              </Button>
              <Button type="submit" disabled={!dirty}>
                Guardar cambios
              </Button>
            </div>
          </div>
        </form>
      </div>
    </>
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
