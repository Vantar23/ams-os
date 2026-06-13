"use client"

import { LogOutIcon } from "lucide-react"

// El "recuerdo" del acomodador que usa la pantalla de inicio de sesión para
// auto-redirigir. Cerrar sesión = olvidarlo y volver a pedir el teléfono.
const STORAGE_KEY = "ams-os.personal"

/**
 * Cierra la sesión del acomodador en este dispositivo: olvida el acceso
 * recordado y lleva a la pantalla de inicio de sesión por teléfono, donde
 * puede entrar con otra cuenta. No desvincula el dispositivo en la base, así
 * que volver a entrar con el mismo teléfono no requiere reactivar nada.
 */
export function LogoutLink({
  asambleaId,
  label = "Cerrar sesión",
}: {
  asambleaId?: string
  label?: string
}) {
  function onClick() {
    try {
      window.localStorage.removeItem(STORAGE_KEY)
    } catch {
      /* ignored */
    }
    window.location.href = asambleaId ? `/asistencia/${asambleaId}` : "/"
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
    >
      <LogOutIcon className="size-3.5" />
      {label}
    </button>
  )
}
