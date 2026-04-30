import Image from "next/image";
import Link from "next/link";

export default function HomePage() {
  return (
    <main className="relative min-h-svh">
      <div className="grid min-h-svh lg:grid-cols-2">
        <div className="relative h-56 sm:h-72 lg:h-auto">
          <Image
            src="/1102026193_univ_lsr_lg.jpg"
            alt="Asamblea regional — paisaje natural con asistentes"
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="object-cover"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent lg:bg-gradient-to-r lg:from-transparent lg:to-background/40"
          />
        </div>

        <div className="flex items-center justify-center px-5 py-10 sm:px-10 sm:py-12 lg:px-16 lg:py-16">
          <div className="w-full max-w-md">
            <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground sm:text-xs sm:tracking-[0.25em]">
              Asamblea Regional 2026
            </p>
            <h1 className="mt-3 font-serif text-[2rem] leading-[1.1] text-foreground sm:mt-4 sm:text-4xl sm:leading-tight lg:text-5xl">
              Departamento de acomodadores
            </h1>
            <p className="mt-4 text-[15px] text-muted-foreground sm:mt-5 sm:text-base">
              Sistema de organización del personal voluntario que sirve como
              acomodadores y capitanes durante las asambleas regionales.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:mt-10 sm:flex-row sm:items-center">
              <Link
                href="/register"
                className="inline-flex w-full items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-accent shadow-sm h-12 px-6 text-base sm:w-auto"
              >
                Registrar asamblea
              </Link>
              <Link
                href="/login"
                className="inline-flex w-full items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background hover:text-foreground h-12 px-6 text-base text-muted-foreground sm:w-auto"
              >
                Iniciar sesión
              </Link>
            </div>
            <div className="mt-8 border-t border-border pt-5 sm:mt-10 sm:pt-6">
              <p className="text-[13px] leading-relaxed text-muted-foreground sm:text-sm">
                ¿Recibiste un enlace por WhatsApp para confirmar tu
                disponibilidad? Ábrelo desde el mismo mensaje. El enlace es
                personal y caduca a los 14 días.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
