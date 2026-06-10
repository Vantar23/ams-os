import { redirect } from "next/navigation"

import { PageHeader } from "@/components/page-header"
import { createClient } from "@/lib/supabase/server"

import { MensajesClient, type MensajeRow, type PersonaInfo } from "./mensajes-client"

export default async function MensajesPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: asambleas } = await supabase
    .from("asambleas")
    .select("id, numero, edicion")
    .order("created_at", { ascending: false })
    .limit(1)
  const asamblea = asambleas?.[0]

  if (!asamblea) {
    return (
      <>
        <PageHeader parent="Reportes" title="Mensajes" />
        <div className="flex flex-1 items-center justify-center p-10">
          <p className="text-sm text-muted-foreground">
            Crea tu primera asamblea para recibir mensajes del personal.
          </p>
        </div>
      </>
    )
  }

  const [{ data: mensajes }, { data: acomodadores }, { data: hermanas }] =
    await Promise.all([
      supabase
        .from("mensajes")
        .select(
          "id, persona_tipo, persona_id, remitente, cuerpo, leido, created_at",
        )
        .eq("asamblea_id", asamblea.id)
        .order("created_at", { ascending: true }),
      supabase
        .from("acomodadores")
        .select("id, nombre, apellido, congregacion, telefono")
        .eq("asamblea_id", asamblea.id),
      supabase
        .from("hermanas_apoyo")
        .select("id, nombre, apellido, congregacion, telefono")
        .eq("asamblea_id", asamblea.id),
    ])

  const personas: PersonaInfo[] = [
    ...((acomodadores ?? []) as Omit<PersonaInfo, "tipo">[]).map((p) => ({
      ...p,
      tipo: "acomodador" as const,
    })),
    ...((hermanas ?? []) as Omit<PersonaInfo, "tipo">[]).map((p) => ({
      ...p,
      tipo: "hermana" as const,
    })),
  ]

  return (
    <>
      <PageHeader parent="Reportes" title="Mensajes" />
      <MensajesClient
        asamblea={asamblea}
        mensajes={(mensajes ?? []) as MensajeRow[]}
        personas={personas}
      />
    </>
  )
}
