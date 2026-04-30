"use client"

import * as React from "react"

type Tipo = "acomodador" | "hermana"

const STORAGE_KEY = "ams-os.personal"

export function RememberPersonal({
  tipo,
  id,
  asambleaId,
  nombre,
  apellido,
}: {
  tipo: Tipo
  id: string
  asambleaId: string
  nombre: string
  apellido: string
}) {
  React.useEffect(() => {
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ tipo, id, asambleaId, nombre, apellido }),
      )
    } catch {
      /* ignored */
    }
  }, [tipo, id, asambleaId, nombre, apellido])
  return null
}
