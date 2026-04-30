import Link from "next/link"

import { createClient } from "@/lib/supabase/server"

import { ResetForm } from "./reset-form"

export default async function Page({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const supabase = await createClient()
  const { data } = await supabase.rpc("reset_capitan_validate", {
    p_token: token,
  })
  const info = (data ?? [])[0] as
    | {
        asamblea_numero: string
        asamblea_edicion: string
        capitan_nombre: string
        capitan_apellido: string
        tiene_cuenta: boolean
      }
    | undefined

  if (!info) {
    return (
      <main className="flex min-h-svh items-center justify-center px-5 py-12">
        <div className="w-full max-w-md text-center">
          <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground sm:text-xs sm:tracking-[0.25em]">
            Enlace no válido
          </p>
          <h1 className="mt-3 font-serif text-[1.75rem] leading-tight text-foreground sm:text-3xl">
            Este enlace expiró o no existe
          </h1>
          <p className="mt-4 text-sm text-muted-foreground">
            Pídele al organizador que te envíe uno nuevo.
          </p>
          <Link
            href="/"
            className="mt-8 inline-block text-sm text-foreground underline underline-offset-4"
          >
            Volver al inicio
          </Link>
        </div>
      </main>
    )
  }

  return <ResetForm token={token} info={info} />
}
