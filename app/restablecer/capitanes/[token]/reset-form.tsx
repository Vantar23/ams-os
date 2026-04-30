"use client"

import * as React from "react"
import Link from "next/link"
import { CheckIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

import { completarRegistroCapitan, restablecerCapitanPassword } from "./actions"

type Info = {
  asamblea_numero: string
  asamblea_edicion: string
  capitan_nombre: string
  capitan_apellido: string
  tiene_cuenta: boolean
}

export function ResetForm({
  token,
  info,
}: {
  token: string
  info: Info
}) {
  const [submitting, setSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [done, setDone] = React.useState(false)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const password = String(fd.get("nuevaPassword") ?? "")
    const confirm = String(fd.get("confirm") ?? "")

    if (password !== confirm) {
      setError("Las contraseñas no coinciden.")
      return
    }

    setSubmitting(true)
    setError(null)

    if (info.tiene_cuenta) {
      const identificador = String(fd.get("identificador") ?? "").trim()
      if (!identificador) {
        setError("Ingresa tu correo o teléfono.")
        setSubmitting(false)
        return
      }
      const { ok, error: err } = await restablecerCapitanPassword({
        token,
        identificador,
        nuevaPassword: password,
      })
      setSubmitting(false)
      if (!ok) {
        setError(err)
        return
      }
      setDone(true)
    } else {
      const identificador = String(fd.get("identificador") ?? "").trim()
      if (!identificador) {
        setError("Ingresa tu correo o teléfono.")
        setSubmitting(false)
        return
      }
      const { ok, error: err } = await completarRegistroCapitan({
        token,
        identificador,
        password,
      })
      setSubmitting(false)
      if (!ok) {
        setError(err)
        return
      }
      setDone(true)
    }
  }

  const isReset = info.tiene_cuenta

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
            ? `Hola ${info.capitan_nombre} ${info.capitan_apellido}. Por seguridad, confirma tu identidad y elige una nueva contraseña.`
            : `Hola ${info.capitan_nombre} ${info.capitan_apellido}. Todavía no tienes cuenta — crea tu correo y contraseña para acceder a la plataforma.`}
        </p>

        <form onSubmit={onSubmit} className="mt-8 grid gap-4">
          {isReset ? (
            <div className="grid gap-1.5">
              <Label htmlFor="identificador">Correo o teléfono</Label>
              <Input
                id="identificador"
                name="identificador"
                autoComplete="email"
                placeholder="juan@ejemplo.com o 5512345678"
                onKeyDown={(e) => {
                  if (e.key === " ") e.preventDefault()
                }}
                required
              />
              <p className="text-xs text-muted-foreground">
                Escribe el correo con el que creaste tu cuenta de capitán, o
                el teléfono que diste al registrarte. Tiene que ser el mismo
                dato que ya está registrado en la asamblea — si no coincide,
                no podemos cambiar la contraseña.
              </p>
            </div>
          ) : (
            <div className="grid gap-1.5">
              <Label htmlFor="identificador">Correo o teléfono</Label>
              <Input
                id="identificador"
                name="identificador"
                autoComplete="username"
                placeholder="juan@ejemplo.com o 5512345678"
                onKeyDown={(e) => {
                  if (e.key === " ") e.preventDefault()
                }}
                required
              />
              <p className="text-xs text-muted-foreground">
                Si te agregaron manualmente, debe ser el mismo teléfono con el
                que te registraron. Será tu identificador para iniciar sesión.
              </p>
            </div>
          )}
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
