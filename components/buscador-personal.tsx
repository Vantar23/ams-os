"use client"

import { SearchIcon, XIcon } from "lucide-react"

import { Input } from "@/components/ui/input"

/** Barra de búsqueda para las listas de personal. */
export function BuscadorPersonal({
  value,
  onChange,
  placeholder = "Buscar por nombre, congregación o teléfono…",
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <div className="relative">
      <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="text"
        inputMode="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label="Buscar"
        autoComplete="off"
        className="pl-8 pr-8"
      />
      {value !== "" && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Limpiar búsqueda"
          className="absolute top-1/2 right-1.5 inline-flex size-6 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <XIcon className="size-3.5" />
        </button>
      )}
    </div>
  )
}

/** True si la persona coincide con el texto buscado (sin acentos ni mayúsculas). */
export function coincideBusqueda(
  query: string,
  ...campos: Array<string | null | undefined>
): boolean {
  const q = normaliza(query)
  if (!q) return true
  const haystack = normaliza(campos.filter(Boolean).join(" "))
  return q.split(/\s+/).every((palabra) => haystack.includes(palabra))
}

function normaliza(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
}
