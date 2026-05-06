"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { CheckIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createClient } from "@/lib/supabase/client"

import { completarRegistroSubAux, restablecerSubAuxPassword } from "./actions"

type Info = {
  asamblea_numero: string
  asamblea_edicion: string
  persona_nombre: string
  persona_apellido: string
  role: "subcapitan" | "auxiliar"
  tiene_cuenta: boolean
}

const ROLE_LABEL: Record<Info["role"], string> = {
  subcapitan: "subcapitán",
  auxiliar: "auxiliar",
}

export function ResetForm({
  token,
  info,
}: {
  token: string
  info: Info
}) {
  const router = useRouter()
  const supabase = React.useMemo(() => createClient(), [])
  const [submitting, setSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [done, setDone] = React.useState(false)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const password = String(fd.get("nuevaPassword") ?? "")
    const confirm = String(fd.get("confirm") ?? "")
    const identificador = String(fd.get("identificador") ?? "").trim()

    if (password !== confirm) {
      setError("Las contraseñas no coinciden.")
      return
    }
    if (!identificador) {
      setError("Ingresa tu correo o teléfono.")
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      if (info.tiene_cuenta) {
        const { ok, error: err } = await restablecerSubAuxPassword({
          token,
          identificador,
          nuevaPassword: password,
        })
        if (!ok) {
          setError(err)
          return
        }
      } else {
        const { ok, error: err } = await completarRegistroSubAux({
          token,
          identificador,
          password,
        })
        if (!ok) {
          setError(err)
          return
        }
      }

      const { data: resolved } = await supabase.rpc("lookup_login_email", {
        p_identifier: identificador,
      })
      const email = resolved as string | null
      if (email) {
        const { error: signInErr } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (!signInErr) {
          router.replace("/sub-aux")
          router.refresh()
          return
        }
      }
      setDone(true)
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Algo salió mal, vuelve a intentar.",
      )
    } finally {
      setSubmitting(false)
    }
  }

  const isReset = info.tiene_cuenta
  const roleLabel = ROLE_LABEL[info.role]

  if (done) {
    return (
      <main className="flex min-h-svh items-center justify-center px-5 py-12">
        <div className="w-full max-w-md text-center">
          <div className="mx-auto inline-flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <CheckIcon className="size-6" />
          </div>
          <h1 className="mt-6 font-serif text-[1.75rem] leading-tight text-foreground sm:text-3xl">
            {isReset ? "Contraseña actualizada" : "Cuenta creada"}
          </h1>
          <p className="mt-4 text-sm text-muted-foreground">
            Ya puedes iniciar sesión con tu{" "}
            {isReset ? "nueva contraseña" : "correo y contraseña"}.
          </p>
          <Button asChild size="lg" className="mt-8 w-full">
            <Link href="/login">Ir a iniciar sesión</Link>
          </Button>
        </div>
      </main>
    )
  }

  return (
    <main className="flex min-h-svh items-center justify-center px-5 py-10 sm:py-12">
      <div className="w-full max-w-md">
        <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground sm:text-xs sm:tracking-[0.25em]">
          Asamblea N° {info.asamblea_numero} — {info.asamblea_edicion}
        </p>
        <h1 className="mt-3 font-serif text-[2rem] leading-[1.1] text-foreground sm:text-4xl sm:leading-tight">
          {isReset ? "Restablecer contraseña" : "Activar tu cuenta"}
        </h1>
        <p className="mt-4 text-[15px] text-muted-foreground sm:text-base">
          {isReset
            ? `Hola ${info.persona_nombre} ${info.persona_apellido}. Por seguridad, confirma tu identidad y elige una nueva contraseña.`
            : `Hola ${info.persona_nombre} ${info.persona_apellido}. Todavía no tienes cuenta como ${roleLabel} — crea tu correo y contraseña para acceder a la plataforma.`}
        </p>

        <form onSubmit={onSubmit} className="mt-8 grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="identificador">Correo o teléfono</Label>
            <Input
              id="identificador"
              name="identificador"
              autoComplete={isReset ? "email" : "username"}
              placeholder="juan@ejemplo.com o 5512345678"
              onKeyDown={(e) => {
                if (e.key === " ") e.preventDefault()
              }}
              required
            />
            <p className="text-xs text-muted-foreground">
              {isReset
                ? "Escribe el correo con el que creaste tu cuenta, o el teléfono que diste al registrarte. Tiene que coincidir con lo que está registrado."
                : "Si te agregaron manualmente, debe ser el mismo teléfono con el que te registraron. Será tu identificador para iniciar sesión."}
            </p>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="nuevaPassword">
              {isReset ? "Nueva contraseña" : "Contraseña"}
            </Label>
            <Input
              id="nuevaPassword"
              name="nuevaPassword"
              type="password"
              autoComplete="new-password"
              placeholder="Mínimo 8 caracteres"
              minLength={8}
              required
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="confirm">Confirmar contraseña</Label>
            <Input
              id="confirm"
              name="confirm"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button
            type="submit"
            size="lg"
            className="mt-2 w-full"
            disabled={submitting}
          >
            {submitting
              ? isReset
                ? "Actualizando…"
                : "Creando cuenta…"
              : isReset
                ? "Actualizar contraseña"
                : "Crear cuenta"}
          </Button>
        </form>
      </div>
    </main>
  )
}
