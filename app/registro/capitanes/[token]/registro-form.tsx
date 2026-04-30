"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"

import { AREAS_CAPITAN, type AreaCapitan } from "@/app/(app)/capitanes/areas"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { DisponibilidadSlot } from "@/lib/disponibilidad"
import { createClient } from "@/lib/supabase/client"

import { submitCapitanRegistro } from "./actions"

const schema = z
  .object({
    nombre: z.string().min(1, "Requerido"),
    apellido: z.string().min(1, "Requerido"),
    congregacion: z.string().min(1, "Requerido"),
    telefono: z.string().min(6, "Teléfono inválido"),
    area: z.enum(AREAS_CAPITAN),
    notas: z.string().optional(),
    email: z.email("Correo inválido"),
    password: z.string().min(8, "Mínimo 8 caracteres"),
    confirmPassword: z.string().min(1, "Requerido"),
  })
  .refine((d) => d.password === d.confirmPassword, {
    path: ["confirmPassword"],
    message: "Las contraseñas no coinciden",
  })

type Values = z.infer<typeof schema>

type Asamblea = {
  asamblea_id: string
  numero: string
  edicion: string
  titulo: string
}

export function CapitanRegistroForm({
  token,
  asamblea,
}: {
  token: string
  asamblea: Asamblea
}) {
  const router = useRouter()
  const supabase = React.useMemo(() => createClient(), [])
  const turnstileRef = React.useRef<TurnstileInstance>(null)
  const [captchaToken, setCaptchaToken] = React.useState<string | null>(null)
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
      area: "Entrada",
      notas: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  })

  function resetCaptcha() {
    setCaptchaToken(null)
    turnstileRef.current?.reset()
  }

  async function onSubmit(values: Values) {
    if (!captchaToken) {
      setSubmitError("Confirma el captcha antes de continuar.")
      return
    }
    setSubmitError(null)
    setSubmitting(true)
    let success = false

    try {
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

      if (error) {
        setSubmitError(error.message)
        return
      }
      if (!data.session) {
        setSubmitError(
          "Tu cuenta se creó pero falta confirmar el correo. Pídele al organizador que apague 'Confirm email' o que te re-envíe el enlace.",
        )
        return
      }

      const { ok, error: registroError } = await submitCapitanRegistro({
        token,
        nombre: values.nombre,
        apellido: values.apellido,
        congregacion: values.congregacion,
        telefono: values.telefono,
        area: values.area as AreaCapitan,
        notas: values.notas ?? "",
        disponibilidad,
      })
      if (!ok) {
        setSubmitError(registroError)
        return
      }
      success = true
    } catch (e) {
      setSubmitError(
        e instanceof Error ? e.message : "Algo salió mal, vuelve a intentar.",
      )
    } finally {
      setSubmitting(false)
      if (!success) resetCaptcha()
    }

    if (success) {
      router.replace("/capitanes")
      router.refresh()
    }
  }

  return (
    <main className="flex min-h-svh items-center justify-center px-5 py-10 sm:py-12">
      <div className="w-full max-w-xl">
        <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground sm:text-xs sm:tracking-[0.25em]">
          Asamblea N° {asamblea.numero} — {asamblea.edicion}
        </p>
        <h1 className="mt-3 font-serif text-[2rem] leading-[1.1] text-foreground sm:text-4xl sm:leading-tight">
          Registro de capitán
        </h1>
        <p className="mt-4 text-[15px] text-muted-foreground sm:text-base">
          Completa el formulario para servir como capitán. Crea tu cuenta y
          tendrás acceso a Personal en la plataforma.
        </p>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="mt-8 grid gap-8"
          >
            <section className="grid gap-4">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Tu cuenta
              </p>
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
              <div className="grid gap-3 sm:grid-cols-2">
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
                      <FormLabel>Confirmar</FormLabel>
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
              </div>
            </section>

            <section className="grid gap-4">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Tus datos
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="nombre"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre</FormLabel>
                      <FormControl>
                        <Input placeholder="Carlos" {...field} />
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
                        <Input placeholder="López" {...field} />
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
                name="area"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Área a cargo</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {AREAS_CAPITAN.map((a) => (
                          <SelectItem key={a} value={a}>
                            {a}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                        placeholder="Particularidades del área, etc."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </section>

            <section className="grid gap-3">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Disponibilidad
              </p>
              <DisponibilidadSelector
                value={disponibilidad}
                onChange={setDisponibilidad}
              />
            </section>

            <div>
              <Turnstile
                ref={turnstileRef}
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
              {submitting ? "Creando cuenta…" : "Crear cuenta de capitán"}
            </Button>
          </form>
        </Form>
      </div>
    </main>
  )
}
