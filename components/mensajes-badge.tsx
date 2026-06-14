"use client"

import * as React from "react"

import { useNotificaciones } from "@/components/notificaciones-context"

/**
 * Globito con los mensajes del personal sin leer, para el item "Mensajes"
 * del sidebar. El contador vive en {@link NotificacionesProvider}; al abrir la
 * conversación los mensajes se marcan leídos y el globito desaparece.
 */
export function MensajesBadge() {
  const { mensajes: count } = useNotificaciones()

  if (count === 0) return null

  return (
    <span className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">
      {count > 99 ? "99+" : count}
    </span>
  )
}
