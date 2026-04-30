"use client"

import * as React from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { DisponibilidadSlot } from "@/lib/disponibilidad"

import { lookupPersonal } from "./actions"

type Tipo = "acomodador" | "hermana"

type Stored = {
  tipo: Tipo
  id: string
  asambleaId: string
  nombre: string
  apellido: string
}

type Status =
  | { kind: "loading" }
  | { kind: "form" }
  | { kind: "submitting" }
  | { kind: "redirecting" }
  | { kind: "error"; message: string }

const STORAGE_KEY = "ams-os.personal"

function readStored(asambleaId: string): Stored | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Stored
    if (
      !parsed ||
      typeof parsed !== "object" ||
      parsed.asambleaId !== asambleaId
    ) {
      return null
    }
    return parsed
  } catch {
    return null
  }
}

function writeStored(value: Stored) {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
  } catch {
    /* ignored */
  }
}

function clearStored() {
  if (typeof window === "undefined") return
  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* ignored */
  }
}

function pathFor(tipo: Tipo, accessToken: string, slot: DisponibilidadSlot) {
  const base =
    tipo === "acomodador" ? "/acomodador/" : "/hermana-apoyo/"
  return `${base}${accessToken}?slot=${encodeURIComponent(slot)}`
}

export function AsistenciaGeneral({
  asambleaId,
  slot,
  dia,
  sesion,
  asambleaLabel,
}: {
  asambleaId: string
  slot: DisponibilidadSlot
  dia: string
  sesion: string
  asambleaLabel: string
}) {
  const [status, setStatus] = React.useState<Status>({ kind: "loading" })

  React.useEffect(() => {
    const stored = readStored(asambleaId)
    if (!stored) {
      setStatus({ kind: "form" })
      return
    }
    let cancelled = false
    setStatus({ kind: "submitting" })
    lookupPersonal({
      asambleaId,
      tipo: stored.tipo,
      id: stored.id,
    }).then((res) => {
      if (cancelled) return
      if (!res.ok || !res.result) {
        // El registro guardado ya no existe — pedir teléfono.
        clearStored()
        setStatus({ kind: "form" })
        return
      }
      writeStored({
        tipo: res.result.tipo,
        id: res.result.id,
        asambleaId,
        nombre: res.result.nombre,
        apellido: res.result.apellido,
      })
      setStatus({ kind: "redirecting" })
      window.location.href = pathFor(res.result.tipo, res.result.accessToken, slot)
    })
    return () => {
      cancelled = true
    }
  }, [asambleaId, slot])

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const telefono = String(fd.get("telefono") ?? "").trim()
    if (!telefono) {
      setStatus({ kind: "error", message: "Ingresa tu teléfono." })
      return
    }
    setStatus({ kind: "submitting" })
    const res = await lookupPersonal({ asambleaId, telefono })
    if (!res.ok || !res.result) {
      setStatus({
        kind: "error",
        message: res.error ?? "No pudimos identificarte.",
      })
      return
    }
    writeStored({
      tipo: res.result.tipo,
      id: res.result.id,
      asambleaId,
      nombre: res.result.nombre,
      apellido: res.result.apellido,
    })
    setStatus({ kind: "redirecting" })
    window.location.href = pathFor(res.result.tipo, res.result.accessToken, slot)
  }

  if (
    status.kind === "loading" ||
    status.kind === "submitting" ||
    status.kind === "redirecting"
  ) {
    return (
      <main className="flex min-h-svh items-center justify-center px-5 py-12">
        <p className="text-sm text-muted-foreground">
          {status.kind === "redirecting"
            ? "Abriendo tu acceso…"
            : "Identificando…"}
        </p>
      </main>
    )
  }

  // form / error
  return (
    <main className="flex min-h-svh items-center justify-center px-5 py-10 sm:py-12">
      <div className="w-full max-w-md">
        <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground sm:text-xs sm:tracking-[0.25em]">
          {asambleaLabel}
        </p>
        <h1 className="mt-3 font-serif text-[2rem] leading-[1.1] text-foreground sm:text-4xl sm:leading-tight">
          Iniciar sesión
        </h1>
        <p className="mt-4 text-[15px] text-muted-foreground sm:text-base">
          {dia} · {sesion}. Confirma tu teléfono para entrar a tu acceso
          personal y registrar tu asistencia.
        </p>

        <form onSubmit={onSubmit} className="mt-8 grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="telefono">Teléfono</Label>
            <Input
              id="telefono"
              name="telefono"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="5512345678"
              onKeyDown={(e) => {
                if (e.key === " ") e.preventDefault()
              }}
              required
            />
            <p className="text-xs text-muted-foreground">
              Tiene que ser el mismo teléfono con el que estás registrado en la
              asamblea.
            </p>
          </div>

          {status.kind === "error" && (
            <p className="text-sm text-destructive">{status.message}</p>
          )}

          <Button type="submit" size="lg" className="mt-2 w-full">
            Continuar
          </Button>
        </form>
      </div>
    </main>
  )
}
