import Link from "next/link"
import { ArrowLeftIcon } from "lucide-react"

import { RecepcionForm } from "@/app/acomodador/[access_token]/recepcion-local/recepcion-form"
import { createAdminClient } from "@/lib/supabase/admin"

import { BlockedView } from "../blocked-view"
import { ClaimView } from "../claim-view"
import { loadHermanaByToken } from "../load"

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

  const admin = createAdminClient()
  const { data: areaRows } = await admin
    .from("areas")
    .select("piso, nombre")
    .eq("asamblea_id", result.hermana.asamblea_id)
    .order("piso", { ascending: true })
    .order("nombre", { ascending: true })
  const areas = (areaRows ?? []) as Array<{ piso: string; nombre: string }>

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
        Recepción del local
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Reporta cosas rotas o que falten en el lugar de la asamblea. Tu capitán
        verá tu reporte.
      </p>

      <RecepcionForm
        accessToken={access_token}
        areas={areas}
        tipoPersonal="hermana"
      />
    </main>
  )
}
