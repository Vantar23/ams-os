import Link from "next/link"

/** Tarjeta de navegación de los portales personales. */
export function NavCard({
  href,
  icon,
  title,
  description,
}: {
  href: string
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-4 rounded-xl border bg-surface p-4 transition-colors hover:border-primary/50 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-border bg-background text-foreground">
        {icon}
      </span>
      <span className="flex flex-col">
        <span className="text-base font-medium text-foreground">{title}</span>
        <span className="text-xs text-muted-foreground">{description}</span>
      </span>
    </Link>
  )
}
