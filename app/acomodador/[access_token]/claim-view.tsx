"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { ShieldCheckIcon } from "lucide-react"

import { AvisoAceptacion } from "@/components/aviso-aceptacion"
import { Button } from "@/components/ui/button"

import { claimAccess } from "./actions"
import { LogoutLink } from "./logout-link"

type Asamblea = {
  numero: string
  edicion: string
  titulo: string
}

export function ClaimView({
  accessToken,
  nombre,
  asamblea,
  asambleaId,
}: {
  accessToken: string
  nombre: string
  asamblea: Asamblea
  asambleaId?: string
}) {
  const router = useRouter()
  const [submitting, setSubmitting] = React.useState(false)
  const [aceptado, setAceptado] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  async function onConfirm() {
    setError(null)
    setSubmitting(true)
    const { ok, error: err } = await claimAccess(accessToken)
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
          Hola, {nombre}
        </h1>
        <p className="mt-4 text-sm text-muted-foreground">
          Tu enlace todavía no está activo en ningún dispositivo. Confírmalo en{" "}
          <strong className="text-foreground">este</strong> dispositivo para
          empezar a usarlo. Después solo funcionará aquí.
        </p>

        {error && (
          <p className="mt-4 text-sm text-destructive">
            {error.includes("device_mismatch")
              ? "Otro dispositivo ya confirmó este enlace. Pídele a tu capitán que te genere uno nuevo."
              : error.includes("invalid_access_token")
                ? "Este enlace ya no es válido."
                : error}
          </p>
        )}

        <AvisoAceptacion checked={aceptado} onCheckedChange={setAceptado} />

        <Button
          type="button"
          size="lg"
          className="mt-6 w-full"
          onClick={onConfirm}
          disabled={submitting || !aceptado}
        >
          {submitting ? "Confirmando…" : "Confirmar este dispositivo"}
        </Button>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Si no es tu dispositivo, no confirmes — pídele a tu capitán que
          regenere tu enlace.
        </p>

        <div className="mt-8 border-t border-border pt-6 text-center">
          <LogoutLink
            asambleaId={asambleaId}
            label="Iniciar sesión con otra cuenta"
          />
        </div>
      </div>
    </main>
  )
}
