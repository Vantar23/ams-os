"use client"

import * as React from "react"
import Link from "next/link"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { CheckIcon, CopyIcon } from "lucide-react"

import { DisponibilidadSelector } from "@/components/disponibilidad-selector"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import type { DisponibilidadSlot } from "@/lib/disponibilidad"

import { submitRegistro } from "./actions"

const schema = z.object({
  nombre: z.string().min(1, "Requerido"),
  apellido: z.string().min(1, "Requerido"),
  congregacion: z.string().min(1, "Requerido"),
  telefono: z.string().min(6, "Teléfono inválido"),
  notas: z.string().optional(),
})

type Values = z.infer<typeof schema>

type Asamblea = {
  asamblea_id: string
  numero: string
  edicion: string
  titulo: string
}

export function RegistroForm({
  token,
  asamblea,
}: {
  token: string
  asamblea: Asamblea
}) {
  const [accessToken, setAccessToken] = React.useState<string | null>(null)
  const [submitError, setSubmitError] = React.useState<string | null>(null)
  const [submitting, setSubmitting] = React.useState(false)
  const [disponibilidad, setDisponibilidad] = React.useState<
    DisponibilidadSlot[]
  >([])

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      nombre: "",
      apellido: "",
      congregacion: "",
      telefono: "",
      notas: "",
    },
  })

  async function onSubmit(values: Values) {
    setSubmitError(null)
    setSubmitting(true)
    const { accessToken: at, error } = await submitRegistro({
      token,
      nombre: values.nombre,
      apellido: values.apellido,
      congregacion: values.congregacion,
      telefono: values.telefono,
      notas: values.notas ?? "",
      disponibilidad,
    })
    setSubmitting(false)
    if (error) {
      setSubmitError(error)
      return
    }
    setAccessToken(at)
  }

  if (accessToken) {
    return <SuccessView accessToken={accessToken} asamblea={asamblea} />
  }

  return (
    <main className="flex min-h-svh items-center justify-center px-5 py-10 sm:py-12">
      <div className="w-full max-w-md">
        <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground sm:text-xs sm:tracking-[0.25em]">
          Asamblea N° {asamblea.numero} — {asamblea.edicion}
        </p>
        <h1 className="mt-3 font-serif text-[2rem] leading-[1.1] text-foreground sm:text-4xl sm:leading-tight">
          Registro de acomodador
        </h1>
        <p className="mt-4 text-[15px] text-muted-foreground sm:text-base">
          Completa el formulario para servir como acomodador. Al terminar
          recibes un enlace personal que es tu acceso permanente.
        </p>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="mt-8 grid gap-4"
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="nombre"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre</FormLabel>
                    <FormControl>
                      <Input placeholder="Juan" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="apellido"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Apellido</FormLabel>
                    <FormControl>
                      <Input placeholder="Pérez" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="congregacion"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Congregación</FormLabel>
                  <FormControl>
                    <Input placeholder="Centro" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="telefono"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Teléfono</FormLabel>
                  <FormControl>
                    <Input
                      type="tel"
                      inputMode="tel"
                      placeholder="5512345678"
                      onKeyDown={(e) => {
                        if (e.key === " ") e.preventDefault()
                      }}
                      {...field}
                      onChange={(e) =>
                        field.onChange(e.target.value.replace(/\s+/g, ""))
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="notas"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Notas{" "}
                    <span className="text-muted-foreground">(opcional)</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Disponibilidad, restricciones, etc."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-3">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Disponibilidad
              </p>
              <DisponibilidadSelector
                value={disponibilidad}
                onChange={setDisponibilidad}
              />
            </div>

            {submitError && (
              <p className="text-sm text-destructive">{submitError}</p>
            )}

            <Button
              type="submit"
              size="lg"
              className="mt-2 w-full"
              disabled={submitting}
            >
              {submitting ? "Enviando registro…" : "Enviar registro"}
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              Al enviar, aceptas que el departamento te contacte para coordinar
              tu asignación.
            </p>
          </form>
        </Form>
      </div>
    </main>
  )
}

function SuccessView({
  accessToken,
  asamblea,
}: {
  accessToken: string
  asamblea: Asamblea
}) {
  const origin =
    typeof window === "undefined" ? "" : window.location.origin
  const url = `${origin}/acomodador/${accessToken}`
  const [copied, setCopied] = React.useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* ignored */
    }
  }

  return (
    <main className="flex min-h-svh items-center justify-center px-5 py-12">
      <div className="w-full max-w-md">
        <div className="mx-auto inline-flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <CheckIcon className="size-6" />
        </div>
        <p className="mt-6 text-[11px] uppercase tracking-[0.2em] text-muted-foreground sm:text-xs sm:tracking-[0.25em]">
          Asamblea N° {asamblea.numero} — {asamblea.edicion}
        </p>
        <h1 className="mt-3 font-serif text-[1.75rem] leading-tight text-foreground sm:text-3xl">
          Registro recibido
        </h1>
        <p className="mt-4 text-sm text-muted-foreground">
          Este es tu enlace personal. <strong className="text-foreground">Guárdalo</strong> —
          es tu acceso permanente a la asamblea, y solo funciona en este
          dispositivo.
        </p>

        <div className="mt-6 grid gap-3">
          <p className="text-xs uppercase tracking-[0.15em] text-muted-foreground">
            Tu enlace de acceso
          </p>
          <div className="flex gap-2">
            <Input
              readOnly
              value={url}
              className="font-mono text-xs"
              onFocus={(e) => e.currentTarget.select()}
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={copy}
              aria-label={copied ? "Copiado" : "Copiar enlace"}
            >
              {copied ? <CheckIcon /> : <CopyIcon />}
            </Button>
          </div>
        </div>

        <Button asChild size="lg" className="mt-8 w-full">
          <Link href={url}>Abrir mi acceso</Link>
        </Button>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Si lo pierdes, escríbele a tu capitán para que te genere uno nuevo.
        </p>
      </div>
    </main>
  )
}
