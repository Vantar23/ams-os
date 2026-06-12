import Link from "next/link"
import { redirect } from "next/navigation"

import { PageHeader } from "@/components/page-header"
import {
  EMPTY_ASAMBLEA,
  ESTADOS,
  type AsambleaFormValues,
  type Estado,
} from "@/lib/asamblea"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/server"

import { AjustesClient } from "./ajustes-client"

export default async function AjustesPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: asambleas } = await supabase
    .from("asambleas")
    .select(
      "id, numero, edicion, titulo, fechas, sede, estado, dias_count, dias_label, sesiones_count, sesiones_label, whatsapp_grupo_url, primeros_auxilios_telefono",
    )
    .order("created_at", { ascending: false })
    .limit(1)
  const asamblea = asambleas?.[0]

  if (!asamblea) {
    return (
      <>
        <PageHeader parent="Configuración" title="Ajustes" />
        <div className="flex flex-1 items-center justify-center p-10">
          <div className="max-w-md text-center">
            <h2 className="font-serif text-2xl">Aún no tienes una asamblea</h2>
            <p className="mt-3 text-sm text-muted-foreground">
              Crea tu primera asamblea para poder editar sus ajustes.
            </p>
            <Button asChild className="mt-6">
              <Link href="/register">Crear asamblea</Link>
            </Button>
          </div>
        </div>
      </>
    )
  }

  const { data: miembro } = await supabase
    .from("asamblea_miembros")
    .select("role")
    .eq("asamblea_id", asamblea.id)
    .eq("user_id", user.id)
    .maybeSingle()

  const allowedRoles = ["owner", "subcapitan", "auxiliar"]
  if (!miembro?.role || !allowedRoles.includes(miembro.role)) {
    return (
      <>
        <PageHeader parent="Configuración" title="Ajustes" />
        <div className="flex flex-1 items-center justify-center p-10">
          <div className="max-w-md text-center">
            <h2 className="font-serif text-2xl">Sin acceso</h2>
            <p className="mt-3 text-sm text-muted-foreground">
              Solo el propietario de la asamblea puede modificar los ajustes.
            </p>
          </div>
        </div>
      </>
    )
  }

  const estado = (
    ESTADOS as readonly string[]
  ).includes(asamblea.estado ?? "")
    ? (asamblea.estado as Estado)
    : EMPTY_ASAMBLEA.estado

  const initial: AsambleaFormValues = {
    numero: asamblea.numero != null ? String(asamblea.numero) : "",
    edicion: asamblea.edicion ?? "",
    titulo: asamblea.titulo ?? "",
    fechas: asamblea.fechas ?? "",
    sede: asamblea.sede ?? "",
    estado,
    diasCount: asamblea.dias_count != null ? String(asamblea.dias_count) : "",
    diasLabel: asamblea.dias_label ?? "",
    sesionesCount:
      asamblea.sesiones_count != null ? String(asamblea.sesiones_count) : "",
    sesionesLabel: asamblea.sesiones_label ?? "",
    whatsappGrupoUrl: asamblea.whatsapp_grupo_url ?? "",
    primerosAuxiliosTelefono: asamblea.primeros_auxilios_telefono ?? "",
  }

  return (
    <>
      <PageHeader parent="Configuración" title="Ajustes" />
      <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 lg:px-10">
        <header>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Configuración
          </p>
          <h1 className="mt-2 font-serif text-3xl text-foreground">
            Ajustes de la asamblea
          </h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            Información que aparece en el resumen y los reportes generados.
          </p>
        </header>

        <AjustesClient initial={initial} />
      </div>
    </>
  )
}
