import Link from "next/link"

import { createClient } from "@/lib/supabase/server"

import { SubAuxRegistroForm } from "./registro-form"

export default async function Page({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const supabase = await createClient()
  const { data } = await supabase.rpc("registro_validate", { p_token: token })
  const asamblea = (data ?? [])[0] as
    | {
        asamblea_id: string
        numero: string
        edicion: string
        titulo: string
        target_role: string
      }
    | undefined

  if (
    !asamblea ||
    (asamblea.target_role !== "subcapitan" &&
      asamblea.target_role !== "auxiliar")
  ) {
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

  const { data: areas } = await supabase
    .from("areas")
    .select("id, piso, nombre")
    .eq("asamblea_id", asamblea.asamblea_id)
    .order("piso", { ascending: true })
    .order("nombre", { ascending: true })

  return (
    <SubAuxRegistroForm
      token={token}
      role={asamblea.target_role as "subcapitan" | "auxiliar"}
      asamblea={{
        asamblea_id: asamblea.asamblea_id,
        numero: asamblea.numero,
        edicion: asamblea.edicion,
        titulo: asamblea.titulo,
      }}
      areas={areas ?? []}
    />
  )
}
