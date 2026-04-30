"use client"

import * as React from "react"
import { CheckIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { DisponibilidadSlot } from "@/lib/disponibilidad"

import { confirmAsistencia } from "./actions"

type Stored = {
  tipo: "acomodador" | "hermana"
  id: string
  asambleaId: string
  nombre: string
  apellido: string
}

type Status =
  | { kind: "loading" }
  | { kind: "form" }
  | { kind: "submitting" }
  | { kind: "done"; nombre: string; apellido: string }
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
    confirmAsistencia({
      asambleaId,
      slot,
      tipo: stored.tipo,
      id: stored.id,
    }).then((res) => {
      if (cancelled) return
      if (!res.ok || !res.result) {
        // Si el id guardado ya no es válido, cae al form.
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
      setStatus({
        kind: "done",
        nombre: res.result.nombre,
        apellido: res.result.apellido,
      })
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
    const res = await confirmAsistencia({ asambleaId, slot, telefono })
    if (!res.ok || !res.result) {
      setStatus({
        kind: "error",
        message: res.error ?? "No pudimos confirmar tu asistencia.",
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
    setStatus({
      kind: "done",
      nombre: res.result.nombre,
      apellido: res.result.apellido,
    })
  }

  if (status.kind === "loading" || status.kind === "submitting") {
    return (
      <main className="flex min-h-svh items-center justify-center px-5 py-12">
        <p className="text-sm text-muted-foreground">Confirmando…</p>
      </main>
    )
  }

  if (status.kind === "done") {
    return (
      <main className="flex min-h-svh items-center justify-center px-5 py-12">
        <div className="w-full max-w-md text-center">
          <div className="mx-auto inline-flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <CheckIcon className="size-6" />
          </div>
          <p className="mt-6 text-[11px] uppercase tracking-[0.2em] text-muted-foreground sm:text-xs sm:tracking-[0.25em]">
            {asambleaLabel}
          </p>
          <h1 className="mt-3 font-serif text-[1.75rem] leading-tight text-foreground sm:text-3xl">
            ¡Gracias, {status.nombre}!
          </h1>
          <p className="mt-4 text-sm text-muted-foreground">
            Confirmamos tu asistencia para el <strong>{dia}</strong> en la{" "}
            <strong>{sesion.toLowerCase()}</strong>.
          </p>
        </div>
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
          Confirmar asistencia
        </h1>
        <p className="mt-4 text-[15px] text-muted-foreground sm:text-base">
          {dia} · {sesion}. Confirma tu teléfono para registrarte como presente.
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
            Confirmar asistencia
          </Button>
        </form>
      </div>
    </main>
  )
}
