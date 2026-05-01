import Link from "next/link"
import { AlertTriangleIcon } from "lucide-react"

import type { BlockReason } from "./load"

const TITLES: Record<BlockReason, string> = {
  device_mismatch: "Este enlace ya está activo en otro dispositivo",
  invalid: "Enlace no válido",
  no_cookie: "No pudimos identificar tu dispositivo",
  error: "Algo salió mal",
}

const DESCRIPTIONS: Record<BlockReason, string> = {
  device_mismatch:
    "Tu enlace personal solo funciona en el primer dispositivo donde lo abriste. Pídele a tu capitán que te genere uno nuevo si necesitas pasarlo a este dispositivo.",
  invalid:
    "Este enlace no existe o fue invalidado. Pídele a tu capitán que te envíe uno nuevo.",
  no_cookie:
    "Tu navegador bloqueó el cookie que necesitamos para identificarte. Activa cookies para este sitio y vuelve a intentar.",
  error: "Intenta de nuevo en un momento.",
}

export function BlockedView({
  reason,
  message,
}: {
  reason: BlockReason
  message?: string
}) {
  return (
    <main className="flex min-h-svh items-center justify-center px-5 py-12">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto inline-flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <AlertTriangleIcon className="size-6" />
        </div>
        <h1 className="mt-6 font-serif text-[1.75rem] leading-tight text-foreground sm:text-3xl">
          {TITLES[reason]}
        </h1>
        <p className="mt-4 text-sm text-muted-foreground">
          {reason === "error" && message ? message : DESCRIPTIONS[reason]}
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
