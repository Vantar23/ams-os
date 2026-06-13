"use client"

import * as React from "react"

export type AsambleaInfo = {
  numero: string | null
  edicion: string | null
}

const AsambleaContext = React.createContext<AsambleaInfo | null>(null)

export function AsambleaProvider({
  value,
  children,
}: {
  value: AsambleaInfo | null
  children: React.ReactNode
}) {
  return (
    <AsambleaContext.Provider value={value}>
      {children}
    </AsambleaContext.Provider>
  )
}

export function useAsamblea(): AsambleaInfo | null {
  return React.useContext(AsambleaContext)
}

/** Subtítulo institucional: "Asamblea N° 1 — Asamblea Regional 2026". */
export function asambleaSubtitle(info: AsambleaInfo | null): string | null {
  if (!info) return null
  const partes: string[] = []
  if (info.numero) partes.push(`Asamblea N° ${info.numero}`)
  if (info.edicion) partes.push(info.edicion)
  return partes.length > 0 ? partes.join(" — ") : null
}
