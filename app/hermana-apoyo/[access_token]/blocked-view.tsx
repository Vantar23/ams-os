import Link from "next/link"
import { AlertTriangleIcon } from "lucide-react"

import type { BlockReason } from "./load"
import { RebindButton } from "./rebind-button"

export function BlockedView({
  reason,
  message,
  accessToken,
}: {
  reason: BlockReason
  message?: string
  accessToken?: string
}) {
  const titles: Record<BlockReason, string> = {
    device_mismatch: "Este enlace ya está activo en otro dispositivo",
    invalid: "Enlace no válido",
    no_cookie: "No pudimos identificar tu dispositivo",
    error: "Algo salió mal",
  }
  const descriptions: Record<BlockReason, string> = {
    device_mismatch:
      "Tu enlace personal ya está activo en otro dispositivo. Si es tuyo, puedes cerrar esa sesión y activarlo aquí.",
    invalid:
      "Este enlace no existe o fue invalidado. Pídele a tu capitán que te envíe uno nuevo.",
    no_cookie:
      "Tu navegador bloqueó el cookie que necesitamos para identificarte. Activa cookies para este sitio y vuelve a intentar.",
    error: message ?? "Intenta de nuevo en un momento.",
  }

  return (
    <main className="flex min-h-svh items-center justify-center px-5 py-12">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto inline-flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <AlertTriangleIcon className="size-6" />
        </div>
        <h1 className="mt-6 font-serif text-[1.75rem] leading-tight text-foreground sm:text-3xl">
          {titles[reason]}
        </h1>
        <p className="mt-4 text-sm text-muted-foreground">
          {descriptions[reason]}
        </p>
        {reason === "device_mismatch" && accessToken && (
          <RebindButton accessToken={accessToken} />
        )}
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
