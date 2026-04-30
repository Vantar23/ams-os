"use client"

import * as React from "react"
import Link from "next/link"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { CheckIcon } from "lucide-react"

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

const schema = z.object({
  nombre: z.string().min(1, "Requerido"),
  apellido: z.string().min(1, "Requerido"),
  congregacion: z.string().min(1, "Requerido"),
  telefono: z.string().min(6, "Teléfono inválido"),
  notas: z.string().optional(),
})

export default function RegistroAcomodadorPage() {
  const [submitted, setSubmitted] = React.useState(false)

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      nombre: "",
      apellido: "",
      congregacion: "",
      telefono: "",
      notas: "",
    },
  })

  function onSubmit(_values: z.infer<typeof schema>) {
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <main className="flex min-h-svh items-center justify-center px-5 py-12">
        <div className="w-full max-w-md text-center">
          <div className="mx-auto inline-flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <CheckIcon className="size-6" />
          </div>
          <p className="mt-6 text-[11px] uppercase tracking-[0.2em] text-muted-foreground sm:text-xs sm:tracking-[0.25em]">
            Asamblea Regional 2026
          </p>
          <h1 className="mt-3 font-serif text-[1.75rem] leading-tight text-foreground sm:text-3xl">
            Registro recibido
          </h1>
          <p className="mt-4 text-sm text-muted-foreground">
            Gracias por ofrecerte como acomodador. Un capitán se pondrá en
            contacto pronto para confirmar tu disponibilidad.
          </p>
          <Link
            href="/"
            className="mt-8 inline-block text-sm text-foreground underline underline-offset-4"
          >
            Volver al inicio
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="flex min-h-svh items-center justify-center px-5 py-10 sm:py-12">
      <div className="w-full max-w-md">
        <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground sm:text-xs sm:tracking-[0.25em]">
          Asamblea Regional 2026
        </p>
        <h1 className="mt-3 font-serif text-[2rem] leading-[1.1] text-foreground sm:text-4xl sm:leading-tight">
          Registro de acomodador
        </h1>
        <p className="mt-4 text-[15px] text-muted-foreground sm:text-base">
          Completa el formulario para ofrecerte como acomodador durante la
          asamblea. Tus datos se comparten únicamente con el departamento.
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
                      placeholder="+52 55 1234 5678"
                      {...field}
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
            <Button type="submit" size="lg" className="mt-2 w-full">
              Enviar registro
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
