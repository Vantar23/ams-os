import Link from "next/link"
import { redirect } from "next/navigation"
import {
  LayoutDashboardIcon,
  MapIcon,
  MapPinIcon,
  MessageCircleIcon,
  UsersIcon,
} from "lucide-react"

import { NavCard } from "@/components/nav-card"
import { createClient } from "@/lib/supabase/server"

import { loadCapitanActual } from "./load"

export default async function Page() {
  const actual = await loadCapitanActual()
  // Un owner (o un capitán sin ficha) no tiene menú simple; lo mandamos al
  // sistema completo en vez de a /resumen para no ciclar con el proxy.
  if (!actual) redirect("/acomodadores")
  const { capitan, asamblea } = actual

  const supabase = await createClient()
  const [{ count: totalAcomodadores }, { data: noLeidos }] = await Promise.all([
    supabase
      .from("acomodadores")
      .select("id", { count: "exact", head: true })
      .eq("asamblea_id", asamblea.id)
      .eq("capitan_id", capitan.id),
    supabase.rpc("mensajes_no_leidos_capitan"),
  ])
  const sinLeer = (noLeidos as number | null) ?? 0

  return (
    <main className="mx-auto w-full max-w-2xl px-5 py-10 sm:py-14">
      <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground sm:text-xs sm:tracking-[0.25em]">
        Asamblea N° {asamblea.numero} — {asamblea.edicion}
      </p>
      <h1 className="mt-3 font-serif text-[2rem] leading-[1.1] text-foreground sm:text-4xl sm:leading-tight">
        Hola, {capitan.nombre} {capitan.apellido}
      </h1>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <p className="inline-flex w-fit items-center rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs text-primary">
          Estás asignado como capitán
        </p>
        {capitan.area.map((area) => (
          <span
            key={area}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1 text-xs text-foreground"
          >
            <MapPinIcon className="size-3.5 text-muted-foreground" />
            {area}
          </span>
        ))}
      </div>

      <nav className="mt-10 grid gap-3">
        <NavCard
          href="/capitan/acomodadores"
          icon={<UsersIcon className="size-5" />}
          title="Mis acomodadores"
          description={
            totalAcomodadores
              ? `Tu equipo (${totalAcomodadores}): llámalos o escríbeles por WhatsApp.`
              : "Tu equipo: llámalos o escríbeles por WhatsApp."
          }
        />
        <NavCard
          href="/capitan/mapa"
          icon={<MapIcon className="size-5" />}
          title="Mapa"
          description="Consulta los planos del recinto."
        />
        <NavCard
          href="/capitan/mensajes"
          icon={<MessageCircleIcon className="size-5" />}
          title="Mensajes"
          description="Escríbele al equipo de administración."
          badge={
            sinLeer > 0 ? (
              <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground">
                {sinLeer}
              </span>
            ) : undefined
          }
        />
      </nav>

      <div className="mt-12 border-t border-border pt-6">
        <Link
          href="/acomodadores"
          className="flex items-center justify-center gap-2 rounded-xl border bg-surface px-4 py-3 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
        >
          <LayoutDashboardIcon className="size-4" />
          Sistema administrativo completo
        </Link>
      </div>
    </main>
  )
}
