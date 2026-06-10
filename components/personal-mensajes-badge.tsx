"use client"

import * as React from "react"

import {
  contarNoLeidosPersonal,
  type PersonalTipo,
} from "@/lib/actions/portal-personal"

const POLL_MS = 20000

/**
 * Globito con las respuestas del admin sin leer, para la tarjeta "Mensajes"
 * del menú de los portales. Desaparece al abrir el chat (que las marca
 * leídas).
 */
export function PersonalMensajesBadge({
  tipo,
  accessToken,
}: {
  tipo: PersonalTipo
  accessToken: string
}) {
  const [count, setCount] = React.useState(0)

  React.useEffect(() => {
    let activo = true
    async function recargar() {
      const n = await contarNoLeidosPersonal(tipo, accessToken)
      if (activo) setCount(n)
    }
    const inicial = setTimeout(() => void recargar(), 0)
    const interval = setInterval(() => void recargar(), POLL_MS)
    const onFocus = () => void recargar()
    window.addEventListener("focus", onFocus)
    return () => {
      activo = false
      clearTimeout(inicial)
      clearInterval(interval)
      window.removeEventListener("focus", onFocus)
    }
  }, [tipo, accessToken])

  if (count === 0) return null

  return (
    <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">
      {count > 99 ? "99+" : count}
    </span>
  )
}
