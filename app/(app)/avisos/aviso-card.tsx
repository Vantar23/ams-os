"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { ArchiveIcon, MegaphoneIcon, MessageCircleQuestionIcon } from "lucide-react"

import { cn } from "@/lib/utils"

import { archivarAviso } from "./actions"

export type AvisoResumen = {
  id: string
  tipo: "aviso" | "pregunta"
  titulo: string
  cuerpo: string | null
  opcionA: string | null
  opcionB: string | null
  audiencias: ("acomodador" | "capitan" | "hermana")[]
  expiraAt: string | null
  archivado: boolean
  caducado: boolean
  createdAt: string
  leidos: number
  esperados: number
  votosA: number
  votosB: number
}

const AUD_LABEL: Record<string, string> = {
  acomodador: "Acomodadores",
  capitan: "Capitanes",
  hermana: "Hermanas de apoyo",
}

export function AvisoCard({ aviso }: { aviso: AvisoResumen }) {
  const router = useRouter()
  const [archivando, setArchivando] = React.useState(false)

  async function onArchivar() {
    setArchivando(true)
    const r = await archivarAviso(aviso.id)
    setArchivando(false)
    if (r.ok) router.refresh()
  }

  const pct =
    aviso.esperados > 0
      ? Math.round((aviso.leidos / aviso.esperados) * 100)
      : 0
  const estado = aviso.archivado
    ? { label: "Archivado", className: "bg-muted text-muted-foreground" }
    : aviso.caducado
      ? { label: "Caducado", className: "bg-muted text-muted-foreground" }
      : { label: "Activo", className: "bg-primary/10 text-primary" }

  return (
    <div className="flex flex-col gap-3 rounded-xl border bg-card p-4">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          {aviso.tipo === "pregunta" ? (
            <MessageCircleQuestionIcon className="size-4.5" />
          ) : (
            <MegaphoneIcon className="size-4.5" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-medium leading-tight">{aviso.titulo}</p>
          {aviso.cuerpo && (
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
              {aviso.cuerpo}
            </p>
          )}
        </div>
        <span
          className={cn(
            "shrink-0 rounded-md px-2 py-0.5 text-xs font-medium",
            estado.className,
          )}
        >
          {estado.label}
        </span>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {aviso.audiencias.map((a) => (
          <span
            key={a}
            className="rounded-full border bg-muted/50 px-2 py-0.5 text-xs text-muted-foreground"
          >
            {AUD_LABEL[a]}
          </span>
        ))}
      </div>

      {/* Lecturas */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Leído por</span>
          <span className="font-medium tabular-nums">
            {aviso.leidos} / {aviso.esperados}
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${Math.min(pct, 100)}%` }}
          />
        </div>
      </div>

      {/* Desglose de pregunta */}
      {aviso.tipo === "pregunta" && (
        <div className="flex flex-col gap-2 rounded-lg bg-muted/40 p-3">
          <OpcionBar
            label={aviso.opcionA ?? "Opción A"}
            votos={aviso.votosA}
            total={aviso.votosA + aviso.votosB}
          />
          <OpcionBar
            label={aviso.opcionB ?? "Opción B"}
            votos={aviso.votosB}
            total={aviso.votosA + aviso.votosB}
          />
        </div>
      )}

      {!aviso.archivado && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onArchivar}
            disabled={archivando}
            className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-60"
          >
            <ArchiveIcon className="size-3.5" />
            {archivando ? "Archivando…" : "Archivar"}
          </button>
        </div>
      )}
    </div>
  )
}

function OpcionBar({
  label,
  votos,
  total,
}: {
  label: string
  votos: number
  total: number
}) {
  const pct = total > 0 ? Math.round((votos / total) * 100) : 0
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between text-sm">
        <span className="min-w-0 truncate">{label}</span>
        <span className="shrink-0 font-medium tabular-nums text-muted-foreground">
          {votos} · {pct}%
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-background">
        <div
          className="h-full rounded-full bg-primary/70"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
