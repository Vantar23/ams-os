"use client"

import * as React from "react"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export type AreaOption = { piso: string; nombre: string }

// Sentinel para la opción "Sin especificar" (Radix Select no admite value="").
const NONE = "__none__"

function uniq(values: string[]): string[] {
  return Array.from(new Set(values.filter((v) => v && v.trim() !== "")))
}

export function RecepcionLocationFields({
  areas,
  nivel,
  zona,
  butaca,
  otroObjeto,
  onNivel,
  onZona,
  onButaca,
  onOtroObjeto,
  size = "default",
}: {
  areas: AreaOption[]
  nivel: string
  zona: string
  butaca: string
  otroObjeto: string
  onNivel: (v: string) => void
  onZona: (v: string) => void
  onButaca: (v: string) => void
  onOtroObjeto: (v: string) => void
  size?: "default" | "lg"
}) {
  const niveles = uniq(areas.map((a) => a.piso))
  const zonas = uniq(
    areas.filter((a) => a.piso === nivel).map((a) => a.nombre),
  )
  // Sin catálogo de áreas no hay opciones que elegir: deja escribir libre en
  // vez de mostrar selects deshabilitados.
  const sinCatalogo = niveles.length === 0

  const controlClass = size === "lg" ? "h-12 text-base" : undefined
  const labelClass = size === "lg" ? "text-sm" : undefined

  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-1.5">
          <Label htmlFor={sinCatalogo ? "nivel" : undefined} className={labelClass}>
            Nivel
          </Label>
          {sinCatalogo ? (
            <Input
              id="nivel"
              name="nivel"
              value={nivel}
              onChange={(e) => onNivel(e.target.value)}
              placeholder="Ej. Planta baja"
              autoComplete="off"
              className={controlClass}
            />
          ) : (
            <Select
              value={nivel}
              onValueChange={(v) => {
                onNivel(v === NONE ? "" : v)
                onZona("") // la zona depende del nivel
              }}
            >
              <SelectTrigger className={controlClass}>
                <SelectValue placeholder="Elige nivel" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Sin especificar</SelectItem>
                {niveles.map((n) => (
                  <SelectItem key={n} value={n}>
                    {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor={sinCatalogo ? "zona" : undefined} className={labelClass}>
            Zona
          </Label>
          {sinCatalogo ? (
            <Input
              id="zona"
              name="zona"
              value={zona}
              onChange={(e) => onZona(e.target.value)}
              placeholder="Ej. Sección A"
              autoComplete="off"
              className={controlClass}
            />
          ) : (
            <Select
              value={zona}
              onValueChange={(v) => onZona(v === NONE ? "" : v)}
              disabled={!nivel || zonas.length === 0}
            >
              <SelectTrigger className={controlClass}>
                <SelectValue
                  placeholder={
                    !nivel
                      ? "Elige nivel primero"
                      : zonas.length === 0
                        ? "Sin zonas"
                        : "Elige zona"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Sin especificar</SelectItem>
                {zonas.map((z) => (
                  <SelectItem key={z} value={z}>
                    {z}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-1.5">
          <Label htmlFor="butaca" className={labelClass}>
            Butaca <span className="text-muted-foreground">(opcional)</span>
          </Label>
          <Input
            id="butaca"
            name="butaca"
            value={butaca}
            onChange={(e) => onButaca(e.target.value)}
            placeholder="Ej. F-12"
            autoComplete="off"
            className={controlClass}
          />
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="otro_objeto" className={labelClass}>
            Otro objeto <span className="text-muted-foreground">(opcional)</span>
          </Label>
          <Input
            id="otro_objeto"
            name="otro_objeto"
            value={otroObjeto}
            onChange={(e) => onOtroObjeto(e.target.value)}
            placeholder="Ej. extintor, señal…"
            autoComplete="off"
            className={controlClass}
          />
        </div>
      </div>
    </>
  )
}
