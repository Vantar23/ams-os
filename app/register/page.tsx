"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeftIcon } from "lucide-react"
import { Turnstile } from "@marsidev/react-turnstile"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"

import {
  AsambleaFormFields,
  INITIAL_ASAMBLEA,
  type AsambleaFormValues,
} from "@/components/asamblea-form-fields"
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
import { createClient } from "@/lib/supabase/client"

const userSchema = z
  .object({
    nombre: z.string().min(1, "Requerido"),
    apellido: z.string().min(1, "Requerido"),
    email: z.email("Correo inválido"),
    password: z.string().min(8, "Mínimo 8 caracteres"),
    confirmPassword: z.string().min(1, "Requerido"),
  })
  .refine((d) => d.password === d.confirmPassword, {
    path: ["confirmPassword"],
    message: "Las contraseñas no coinciden",
  })

type UserValues = z.infer<typeof userSchema>

const EMPTY_USER: UserValues = {
  nombre: "",
  apellido: "",
  email: "",
  password: "",
  confirmPassword: "",
}

export default function RegisterPage() {
  const router = useRouter()
  const supabase = React.useMemo(() => createClient(), [])
  const [step, setStep] = React.useState<1 | 2>(1)
  const [userValues, setUserValues] = React.useState<UserValues>(EMPTY_USER)
  const [asamblea, setAsamblea] = React.useState<AsambleaFormValues>(
    INITIAL_ASAMBLEA,
  )

  function updateAsamblea<K extends keyof AsambleaFormValues>(
    k: K,
    v: AsambleaFormValues[K],
  ) {
    setAsamblea((s) => ({ ...s, [k]: v }))
  }

  async function onUserSubmit(
    values: UserValues,
    captchaToken: string,
  ): Promise<string | null> {
    const { data, error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        captchaToken,
        data: {
          nombre: values.nombre,
          apellido: values.apellido,
        },
      },
    })
    if (error) return error.message
    if (!data.session) {
      // Email confirmation está encendido en Supabase. El usuario se creó pero
      // no hay JWT hasta que confirme el correo — y por ahora no enviamos correos.
      return "Tu cuenta se creó pero falta confirmar el correo. Apaga 'Confirm email' en el dashboard de Supabase (Authentication → Sign In / Providers → Email) y vuelve a intentar."
    }
    setUserValues(values)
    setStep(2)
    return null
  }

  const [creatingAsamblea, setCreatingAsamblea] = React.useState(false)
  const [asambleaError, setAsambleaError] = React.useState<string | null>(null)

  async function onAsambleaSubmit(e: React.FormEvent) {
    e.preventDefault()
    setAsambleaError(null)
    setCreatingAsamblea(true)
    const { error } = await supabase.from("asambleas").insert({
      numero: asamblea.numero,
      edicion: asamblea.edicion,
      titulo: asamblea.titulo,
      fechas: asamblea.fechas,
      sede: asamblea.sede,
      estado: asamblea.estado,
      dias_count: Number(asamblea.diasCount),
      dias_label: asamblea.diasLabel,
      sesiones_count: Number(asamblea.sesionesCount),
      sesiones_label: asamblea.sesionesLabel,
    })
    setCreatingAsamblea(false)
    if (error) {
      setAsambleaError(error.message)
      return
    }
    router.replace("/resumen")
    router.refresh()
  }

  return (
    <main className="flex min-h-svh items-center justify-center px-5 py-10 sm:py-12">
      <div className={step === 1 ? "w-full max-w-md" : "w-full max-w-2xl"}>
        <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground sm:text-xs sm:tracking-[0.25em]">
          {`Crear asamblea · Paso ${step} de 2`}
        </p>
        <h1 className="mt-3 font-serif text-[2rem] leading-[1.1] text-foreground sm:text-4xl sm:leading-tight">
          {step === 1 ? "Tu cuenta" : "Datos de la asamblea"}
        </h1>
        <p className="mt-4 text-[15px] text-muted-foreground sm:text-base">
          {step === 1
            ? "Crea tu cuenta de administrador. Vas a poder gestionar varias asambleas desde un mismo acceso."
            : "Información que aparecerá en el resumen y los reportes. Puedes editarla luego desde Ajustes."}
        </p>

        {step === 1 ? (
          <Step1 initial={userValues} onSubmit={onUserSubmit} />
        ) : (
          <form onSubmit={onAsambleaSubmit} className="mt-8">
            <AsambleaFormFields values={asamblea} onChange={updateAsamblea} />

            {asambleaError && (
              <p className="mt-6 text-sm text-destructive">{asambleaError}</p>
            )}

            <div className="mt-10 flex flex-col-reverse gap-3 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setStep(1)}
                disabled={creatingAsamblea}
                className="self-start"
              >
                <ArrowLeftIcon className="size-4" />
                Atrás
              </Button>
              <Button type="submit" size="lg" disabled={creatingAsamblea}>
                {creatingAsamblea ? "Creando asamblea…" : "Crear asamblea"}
              </Button>
            </div>
          </form>
        )}

        {step === 1 && (
          <p className="mt-6 text-center text-xs text-muted-foreground">
            ¿Ya tienes cuenta?{" "}
            <Link
              href="/login"
              className="text-foreground underline underline-offset-4"
            >
              Inicia sesión
            </Link>
          </p>
        )}
      </div>
    </main>
  )
}

function Step1({
  initial,
  onSubmit,
}: {
  initial: UserValues
  onSubmit: (
    values: UserValues,
    captchaToken: string,
  ) => Promise<string | null>
}) {
  const [captchaToken, setCaptchaToken] = React.useState<string | null>(null)
  const [submitError, setSubmitError] = React.useState<string | null>(null)
  const [submitting, setSubmitting] = React.useState(false)

  const form = useForm<UserValues>({
    resolver: zodResolver(userSchema),
    defaultValues: initial,
  })

  async function handle(values: UserValues) {
    if (!captchaToken) return
    setSubmitError(null)
    setSubmitting(true)
    const error = await onSubmit(values, captchaToken)
    setSubmitting(false)
    if (error) setSubmitError(error)
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handle)} className="mt-8 grid gap-4">
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
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Correo</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="juan@ejemplo.com"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Contraseña</FormLabel>
              <FormControl>
                <Input
                  type="password"
                  autoComplete="new-password"
                  placeholder="Mínimo 8 caracteres"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Confirmar contraseña</FormLabel>
              <FormControl>
                <Input
                  type="password"
                  autoComplete="new-password"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="mt-1">
          <Turnstile
            siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!}
            onSuccess={setCaptchaToken}
            onExpire={() => setCaptchaToken(null)}
            onError={() => setCaptchaToken(null)}
            options={{ theme: "auto" }}
          />
        </div>

        {submitError && (
          <p className="text-sm text-destructive">{submitError}</p>
        )}

        <Button
          type="submit"
          size="lg"
          className="mt-2 w-full"
          disabled={!captchaToken || submitting}
        >
          {submitting ? "Creando cuenta…" : "Continuar"}
        </Button>
      </form>
    </Form>
  )
}
