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
    "Este pase de acceso solo funciona en el primer dispositivo donde se confirmó. No puede pasarse a otro. Pide a administración un enlace nuevo si lo necesitas aquí.",
  invalid:
    "Este enlace no existe o el acceso fue revocado. Pide a administración un enlace nuevo.",
  no_cookie:
    "Tu navegador bloqueó el cookie que necesitamos para identificar tu dispositivo. Activa las cookies para este sitio y vuelve a intentar.",
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
      </div>
    </main>
  )
}
