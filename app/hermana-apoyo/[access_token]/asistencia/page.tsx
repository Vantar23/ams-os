import Link from "next/link"
import { ArrowLeftIcon } from "lucide-react"

import {
  DISPONIBILIDAD_DIAS,
  DISPONIBILIDAD_SESIONES,
  momentoEnRecinto,
  slotsVisibles,
} from "@/lib/disponibilidad"

import { BlockedView } from "../blocked-view"
import { ClaimView } from "../claim-view"
import { loadAsignacionesHermana, loadHermanaByToken } from "../load"

const SLOT_LABEL: Record<string, { dia: string; sesion: string }> =
  Object.fromEntries(
    DISPONIBILIDAD_DIAS.flatMap((d) =>
      DISPONIBILIDAD_SESIONES.map((s) => [
        `${d.key}-${s.key}`,
        { dia: d.label, sesion: s.label },
      ]),
    ),
  )

export default async function Page({
  params,
}: {
  params: Promise<{ access_token: string }>
}) {
  const { access_token } = await params
  const result = await loadHermanaByToken(access_token)

  if (result.kind === "blocked") {
    return (
      <BlockedView
        reason={result.reason}
        message={result.message}
        accessToken={access_token}
      />
    )
  }
  if (result.kind === "claim") {
    return (
      <ClaimView
        accessToken={access_token}
        nombre={result.nombre}
        asamblea={result.asamblea}
      />
    )
  }

  const todas = await loadAsignacionesHermana(access_token)
  const visibles = slotsVisibles(
    todas.map((a) => a.slot),
    momentoEnRecinto(),
  )
  const asignaciones = todas.filter((a) => visibles.includes(a.slot))

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-6 sm:px-5 sm:py-14">
      <Link
        href={`/hermana-apoyo/${access_token}`}
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeftIcon className="size-3.5" />
        Volver
      </Link>
      <h1 className="mt-4 font-serif text-[1.75rem] leading-[1.15] text-foreground sm:text-4xl sm:leading-tight">
        Asistencia
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Estos son tus puestos asignados para el turno actual.
      </p>

      {asignaciones.length === 0 ? (
        <p className="mt-6 rounded-xl border bg-surface p-6 text-center text-sm text-muted-foreground">
          {todas.length === 0
            ? "Aún no tienes puesto asignado. Cuando tu capitán te asigne, aparecerá aquí."
            : "No tienes puesto asignado en este turno."}
        </p>
      ) : (
        <ul className="mt-6 grid gap-3">
          {asignaciones.map((a) => {
            const label = SLOT_LABEL[a.slot]
            return (
              <li
                key={a.asignacion_id}
                className="rounded-xl border bg-surface p-4"
              >
                <p className="text-xs uppercase tracking-[0.15em] text-muted-foreground">
                  {label?.dia} · {label?.sesion}
                </p>
                <p className="mt-1 text-base font-medium text-foreground">
                  {a.area_nombre}
                </p>
                <p className="text-xs text-muted-foreground">
                  {a.area_piso}
                  {a.area_capacidad > 0 && ` · cap. ${a.area_capacidad}`}
                  {a.area_filas > 0 && ` · ${a.area_filas} filas`}
                </p>
              </li>
            )
          })}
        </ul>
      )}
    </main>
  )
}
