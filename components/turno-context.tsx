"use client"

import * as React from "react"

import { currentDiaSesion, type DisponibilidadSlot } from "@/lib/disponibilidad"

type Selected = DisponibilidadSlot | "todos"

type TurnoContextValue = {
  /** Turno seleccionado en la vista (o "todos" para la vista general). */
  selected: Selected
  setSelected: (s: Selected) => void
  /** Turno realmente en curso según fecha/hora del cliente (null antes de montar). */
  currentSlot: string | null
}

const TurnoContext = React.createContext<TurnoContextValue | null>(null)

export function TurnoProvider({ children }: { children: React.ReactNode }) {
  const [selected, setSelected] = React.useState<Selected>("todos")
  const [currentSlot, setCurrentSlot] = React.useState<string | null>(null)

  React.useEffect(() => {
    const { dia, sesion } = currentDiaSesion()
    const slot = `${dia}-${sesion}` as DisponibilidadSlot
    setCurrentSlot(slot)
    // Preselecciona el turno en curso en vez de "Todos" al abrir la vista.
    setSelected(slot)
  }, [])

  const value = React.useMemo(
    () => ({ selected, setSelected, currentSlot }),
    [selected, currentSlot],
  )

  return <TurnoContext.Provider value={value}>{children}</TurnoContext.Provider>
}

export function useTurno(): TurnoContextValue {
  const ctx = React.useContext(TurnoContext)
  if (!ctx) {
    throw new Error("useTurno debe usarse dentro de <TurnoProvider>")
  }
  return ctx
}
