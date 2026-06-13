"use client"

import * as React from "react"
import { CalendarIcon } from "lucide-react"

import { WhatsappIcon } from "@/components/whatsapp-icon"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { isValidPhone, normalizePhone } from "@/lib/phone"
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
  /**
   * Muestra, junto a cada teléfono de departamento, un botón para avisarles
   * por WhatsApp que recibirán comunicación durante la asamblea. Solo aplica
   * a una asamblea ya creada (Ajustes), no al alta inicial.
   */
  showAvisosDepartamentos?: boolean
}

export function AsambleaFormFields({
  values,
  onChange,
  showAvisosDepartamentos = false,
}: Props) {
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
          <Field
            label="Primeros auxilios"
            id="primerosAuxiliosTelefono"
            hint="Teléfono al que llamar en una emergencia (10 dígitos, sin +52)."
          >
            <Input
              id="primerosAuxiliosTelefono"
              type="tel"
              inputMode="tel"
              placeholder="5512345678"
              value={values.primerosAuxiliosTelefono ?? ""}
              onChange={(e) =>
                onChange("primerosAuxiliosTelefono", e.target.value)
              }
            />
            {showAvisosDepartamentos && (
              <AvisoDepartamento
                values={values}
                telefono={values.primerosAuxiliosTelefono}
                departamento="primerosAuxilios"
              />
            )}
          </Field>
          <Field
            label="Seguridad"
            id="seguridadTelefono"
            hint="Teléfono del equipo de seguridad (10 dígitos, sin +52)."
          >
            <Input
              id="seguridadTelefono"
              type="tel"
              inputMode="tel"
              placeholder="5512345678"
              value={values.seguridadTelefono ?? ""}
              onChange={(e) => onChange("seguridadTelefono", e.target.value)}
            />
            {showAvisosDepartamentos && (
              <AvisoDepartamento
                values={values}
                telefono={values.seguridadTelefono}
                departamento="seguridad"
              />
            )}
          </Field>
          <Field
            label="Limpieza"
            id="limpiezaTelefono"
            hint="Teléfono del equipo de limpieza (10 dígitos, sin +52)."
          >
            <Input
              id="limpiezaTelefono"
              type="tel"
              inputMode="tel"
              placeholder="5512345678"
              value={values.limpiezaTelefono ?? ""}
              onChange={(e) => onChange("limpiezaTelefono", e.target.value)}
            />
            {showAvisosDepartamentos && (
              <AvisoDepartamento
                values={values}
                telefono={values.limpiezaTelefono}
                departamento="limpieza"
              />
            )}
          </Field>
        </div>
      </section>

      <section className="border-t border-border pt-10">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Recordatorios de turno
        </p>
        <h2 className="mt-2 font-serif text-xl">Inicio del programa</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          A quienes ya tienen puesto asignado les llega un recordatorio 20
          minutos antes de cada sesión. Déjalas en blanco para no enviar
          recordatorios.
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <Field
            label="Inicio mañana"
            id="horaInicioManana"
            hint="Hora local del recinto (México)."
          >
            <Input
              id="horaInicioManana"
              type="time"
              value={values.horaInicioManana ?? ""}
              onChange={(e) => onChange("horaInicioManana", e.target.value)}
            />
          </Field>
          <Field
            label="Inicio tarde"
            id="horaInicioTarde"
            hint="Hora local del recinto (México)."
          >
            <Input
              id="horaInicioTarde"
              type="time"
              value={values.horaInicioTarde ?? ""}
              onChange={(e) => onChange("horaInicioTarde", e.target.value)}
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

type DepartamentoKey = "primerosAuxilios" | "seguridad" | "limpieza"

const DEPARTAMENTO_PROPOSITO: Record<DepartamentoKey, string> = {
  primerosAuxilios: "para atender cualquier emergencia médica",
  seguridad: "para reportar incidentes de seguridad",
  limpieza: "para solicitar atención o limpieza de áreas",
}

/** Mensaje del sistema que avisa al departamento que recibirá comunicación. */
function avisoMensaje(
  values: AsambleaFormValues,
  departamento: DepartamentoKey,
): string {
  const edicion = (values.edicion ?? "").trim()
  const titulo = (values.titulo ?? "").trim()
  const fechas = (values.fechas ?? "").trim()
  const proposito = DEPARTAMENTO_PROPOSITO[departamento]

  const saludo = edicion
    ? `Hola, les saluda la organización de la ${edicion}${
        titulo ? ` ("${titulo}")` : ""
      }.`
    : "Hola, les saluda la organización de la asamblea."
  const cuerpo = `Durante la asamblea${
    fechas ? ` (${fechas})` : ""
  } les estaremos contactando por este medio ${proposito}. Por favor mantengan este número atento a los mensajes del equipo. ¡Gracias por su apoyo!`

  return `${saludo}\n\n${cuerpo}`
}

/**
 * Botón que abre WhatsApp con un mensaje del sistema ya escrito para avisar al
 * departamento que recibirá comunicación durante la asamblea. Solo aparece si
 * el teléfono capturado es válido (10 dígitos).
 */
function AvisoDepartamento({
  values,
  telefono,
  departamento,
}: {
  values: AsambleaFormValues
  telefono: string | null | undefined
  departamento: DepartamentoKey
}) {
  const digits = telefono ? normalizePhone(telefono) : ""
  if (!isValidPhone(digits)) return null
  const url = `https://wa.me/52${digits}?text=${encodeURIComponent(
    avisoMensaje(values, departamento),
  )}`
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="inline-flex w-fit items-center gap-2 rounded-lg border border-emerald-600/40 bg-emerald-600/10 px-3 py-1.5 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-600/15 dark:text-emerald-400"
    >
      <WhatsappIcon className="size-3.5" />
      Avisar que habrá comunicación
    </a>
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
