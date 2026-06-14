"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { ShieldCheckIcon } from "lucide-react"

import { Button } from "@/components/ui/button"

import { claimPase } from "./actions"
import type { AsambleaInfo } from "./load"

export function ClaimView({
  token,
  areaNombre,
  asamblea,
  cupo,
  restantes,
}: {
  token: string
  areaNombre: string
  asamblea: AsambleaInfo
  cupo: number
  restantes: number
}) {
  const router = useRouter()
  const [submitting, setSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const compartido = cupo > 1

  async function onConfirm() {
    setError(null)
    setSubmitting(true)
    const { ok, error: err } = await claimPase(token)
    setSubmitting(false)
    if (!ok) {
      setError(err)
      return
    }
    router.refresh()
  }

  return (
    <main className="flex min-h-svh items-center justify-center px-5 py-12">
      <div className="w-full max-w-md">
        <div className="mx-auto inline-flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <ShieldCheckIcon className="size-6" />
        </div>
        <p className="mt-6 text-[11px] uppercase tracking-[0.2em] text-muted-foreground sm:text-xs sm:tracking-[0.25em]">
          Asamblea N° {asamblea.numero} — {asamblea.edicion}
        </p>
        <h1 className="mt-3 font-serif text-[1.75rem] leading-tight text-foreground sm:text-3xl">
          Acceso a {areaNombre}
        </h1>
        <p className="mt-4 text-sm text-muted-foreground">
          {compartido ? (
            <>
              Este enlace funciona para{" "}
              <strong className="text-foreground">{cupo} dispositivos</strong>.
              Quedan <strong className="text-foreground">{restantes}</strong>{" "}
              disponible{restantes === 1 ? "" : "s"}. Confírmalo en{" "}
              <strong className="text-foreground">este</strong> dispositivo para
              ocupar un lugar; al llenarse no admitirá más.
            </>
          ) : (
            <>
              Este enlace todavía no está activo en ningún dispositivo.
              Confírmalo en{" "}
              <strong className="text-foreground">este</strong> dispositivo para
              usarlo. Después solo funcionará aquí: no podrás abrirlo en otro.
            </>
          )}
        </p>

        {error && (
          <p className="mt-4 text-sm text-destructive">
            {error.includes("limit_reached")
              ? "Este enlace ya alcanzó su límite de dispositivos. Pide uno nuevo a administración."
              : error.includes("invalid_access_token")
                ? "Este enlace ya no es válido."
                : error}
          </p>
        )}

        <Button
          type="button"
          size="lg"
          className="mt-8 w-full"
          onClick={onConfirm}
          disabled={submitting}
        >
          {submitting ? "Confirmando…" : "Confirmar este dispositivo"}
        </Button>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Si no es tu dispositivo, no confirmes — pide a administración que te
          genere un enlace nuevo.
        </p>
      </div>
    </main>
  )
}
