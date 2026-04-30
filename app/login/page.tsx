"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Turnstile } from "@marsidev/react-turnstile"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"

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

const schema = z.object({
  identificador: z.string().min(1, "Requerido"),
  password: z.string().min(1, "Requerido"),
})

type Values = z.infer<typeof schema>

export default function LoginPage() {
  const router = useRouter()
  const supabase = React.useMemo(() => createClient(), [])
  const [captchaToken, setCaptchaToken] = React.useState<string | null>(null)
  const [submitError, setSubmitError] = React.useState<string | null>(null)
  const [submitting, setSubmitting] = React.useState(false)
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { identificador: "", password: "" },
  })

  async function onSubmit(values: Values) {
    if (!captchaToken) return
    setSubmitError(null)
    setSubmitting(true)

    const { data: resolved, error: lookupErr } = await supabase.rpc(
      "lookup_login_email",
      { p_identifier: values.identificador },
    )
    if (lookupErr) {
      setSubmitting(false)
      setSubmitError(lookupErr.message)
      return
    }
    const email = resolved as string | null
    if (!email) {
      setSubmitting(false)
      setSubmitError(
        "No encontramos ninguna cuenta con ese correo o teléfono.",
      )
      return
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: values.password,
      options: { captchaToken },
    })
    setSubmitting(false)
    if (error) {
      setSubmitError(error.message)
      return
    }
    router.replace("/resumen")
    router.refresh()
  }

  return (
    <main className="flex min-h-svh items-center justify-center px-5 py-10 sm:py-12">
      <div className="w-full max-w-md">
        <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground sm:text-xs sm:tracking-[0.25em]">
          Acceso administrativo
        </p>
        <h1 className="mt-3 font-serif text-[2rem] leading-[1.1] text-foreground sm:text-4xl sm:leading-tight">
          Iniciar sesión
        </h1>
        <p className="mt-4 text-[15px] text-muted-foreground sm:text-base">
          Entra con la cuenta que usaste al registrar tu asamblea.
        </p>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="mt-8 grid gap-4"
          >
            <FormField
              control={form.control}
              name="identificador"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Correo o teléfono</FormLabel>
                  <FormControl>
                    <Input
                      autoComplete="username"
                      placeholder="juan@ejemplo.com o 5512345678"
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
              name="password"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <FormLabel>Contraseña</FormLabel>
                    <Link
                      href="#"
                      className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
                    >
                      ¿Olvidaste tu contraseña?
                    </Link>
                  </div>
                  <FormControl>
                    <Input
                      type="password"
                      autoComplete="current-password"
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
              {submitting ? "Iniciando sesión…" : "Iniciar sesión"}
            </Button>
          </form>
        </Form>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          ¿No tienes cuenta?{" "}
          <Link
            href="/register"
            className="text-foreground underline underline-offset-4"
          >
            Registrar asamblea
          </Link>
        </p>
      </div>
    </main>
  )
}
