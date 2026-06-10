"use client"

import * as React from "react"
import { CalendarIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ESTADOS,
  deriveEstructura,
  formatFechas,
  parseFechas,
  type AsambleaFormValues,
  type Estado,
} from "@/lib/asamblea"

export {
  ESTADOS,
  EMPTY_ASAMBLEA,
  INITIAL_ASAMBLEA,
  type AsambleaFormValues,
  type Estado,
} from "@/lib/asamblea"

type Props = {
  values: AsambleaFormValues
  onChange: <K extends keyof AsambleaFormValues>(
    key: K,
    value: AsambleaFormValues[K],
  ) => void
}

export function AsambleaFormFields({ values, onChange }: Props) {
  React.useEffect(() => {
    const range = parseFechas(values.fechas ?? "")
    if (!range) return
    const derived = deriveEstructura(range)
    for (const key of Object.keys(derived) as (keyof typeof derived)[]) {
      if (values[key] !== derived[key]) onChange(key, derived[key])
    }
  }, [values, onChange])

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
            <FechasPicker
              value={values.fechas ?? ""}
              onChange={(v) => onChange("fechas", v)}
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
          <Field
            label="Grupo de WhatsApp"
            id="whatsappGrupoUrl"
            hint="Enlace de invitación al grupo (chat.whatsapp.com/...)."
          >
            <Input
              id="whatsappGrupoUrl"
              type="url"
              inputMode="url"
              placeholder="https://chat.whatsapp.com/..."
              value={values.whatsappGrupoUrl ?? ""}
              onChange={(e) => onChange("whatsappGrupoUrl", e.target.value)}
            />
          </Field>
        </div>
      </section>

      <section className="border-t border-border pt-10">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Estructura
        </p>
        <h2 className="mt-2 font-serif text-xl">Días y sesiones</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Se calculan automáticamente a partir de las fechas. Cada día tiene
          sesión de mañana y tarde.
        </p>
        <div className="mt-5 space-y-4">
          <div className="grid gap-3 sm:grid-cols-[120px_1fr]">
            <Field label="Días" id="diasCount">
              <Input
                id="diasCount"
                readOnly
                tabIndex={-1}
                className="text-muted-foreground"
                value={values.diasCount ?? ""}
              />
            </Field>
            <Field label="Detalle de días" id="diasLabel">
              <Input
                id="diasLabel"
                readOnly
                tabIndex={-1}
                className="text-muted-foreground"
                value={values.diasLabel ?? ""}
              />
            </Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-[120px_1fr]">
            <Field label="Sesiones" id="sesionesCount">
              <Input
                id="sesionesCount"
                readOnly
                tabIndex={-1}
                className="text-muted-foreground"
                value={values.sesionesCount ?? ""}
              />
            </Field>
            <Field label="Detalle de sesiones" id="sesionesLabel">
              <Input
                id="sesionesLabel"
                readOnly
                tabIndex={-1}
                className="text-muted-foreground"
                value={values.sesionesLabel ?? ""}
              />
            </Field>
          </div>
        </div>
      </section>
    </div>
  )
}

function FechasPicker({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) {
  const range = React.useMemo(() => parseFechas(value), [value])

  return (
    <div className="relative">
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="fechas"
            type="button"
            variant="outline"
            className="w-full justify-start font-normal"
          >
            <CalendarIcon className="text-muted-foreground" />
            {value || (
              <span className="text-muted-foreground">
                Selecciona las fechas
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-3" align="start">
          <Calendar
            mode="range"
            selected={range}
            defaultMonth={range?.from}
            onSelect={(r) =>
              onChange(
                r?.from ? formatFechas({ from: r.from, to: r.to }) : "",
              )
            }
          />
        </PopoverContent>
      </Popover>
      <input
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        required
        value={value}
        onChange={() => {}}
      />
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
