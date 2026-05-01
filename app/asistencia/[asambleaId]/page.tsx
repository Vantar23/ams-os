import Link from "next/link"

import { createClient } from "@/lib/supabase/server"

import { LoginRedirector } from "./login-redirector"

export default async function Page({
  params,
}: {
  params: Promise<{ asambleaId: string }>
}) {
  const { asambleaId } = await params

  const supabase = await createClient()
  const { data: asamblea } = await supabase
    .from("asambleas")
    .select("id, numero, edicion")
    .eq("id", asambleaId)
    .maybeSingle()

  if (!asamblea) {
    return (
      <main className="flex min-h-svh items-center justify-center px-5 py-12">
        <div className="w-full max-w-md text-center">
          <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground sm:text-xs sm:tracking-[0.25em]">
            Enlace no válido
          </p>
          <h1 className="mt-3 font-serif text-[1.75rem] leading-tight text-foreground sm:text-3xl">
            Asamblea no encontrada
          </h1>
          <p className="mt-4 text-sm text-muted-foreground">
            Pídele a tu capitán que te envíe un enlace válido.
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

  return (
    <LoginRedirector
      asambleaId={asamblea.id as string}
      asambleaLabel={`Asamblea N° ${asamblea.numero} — ${asamblea.edicion}`}
    />
  )
}
