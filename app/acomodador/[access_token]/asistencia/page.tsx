import Link from "next/link"
import { ArrowLeftIcon } from "lucide-react"

import type { DisponibilidadSlot } from "@/lib/disponibilidad"

import { AsistenciaSection } from "../asistencia-section"
import { BlockedView } from "../blocked-view"
import { ClaimView } from "../claim-view"
import { loadAcomodadorByToken } from "../load"

export default async function Page({
  params,
}: {
  params: Promise<{ access_token: string }>
}) {
  const { access_token } = await params
  const result = await loadAcomodadorByToken(access_token)

  if (result.kind === "blocked") {
    return <BlockedView reason={result.reason} message={result.message} />
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

  const { acomodador } = result
  return (
    <main className="mx-auto w-full max-w-2xl px-5 py-10 sm:py-14">
      <Link
        href={`/acomodador/${access_token}`}
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeftIcon className="size-3.5" />
        Volver
      </Link>
      <h1 className="mt-4 font-serif text-[2rem] leading-[1.1] text-foreground sm:text-4xl sm:leading-tight">
        Confirmación de asistencia
      </h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Marca las sesiones a las que vas a asistir. Tu capitán las verá
        confirmadas.
      </p>
      <AsistenciaSection
        accessToken={access_token}
        disponibilidad={acomodador.disponibilidad as DisponibilidadSlot[]}
        selfConfirmadas={
          acomodador.asistencia_self_confirmada as DisponibilidadSlot[]
        }
      />
    </main>
  )
}
