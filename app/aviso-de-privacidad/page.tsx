import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Aviso de privacidad",
}

// Datos del responsable del tratamiento. Conviene que un asesor legal valide
// el texto final del aviso antes de publicarlo.
const RESPONSABLE = {
  nombre: "David Antonio Arenas",
  domicilio: "Carretera Paso de Cortés 3311, Puebla, Puebla, México",
  contacto: "davidantarenas@icloud.com",
}
const ULTIMA_ACTUALIZACION = "20 de junio de 2026"

export default function AvisoDePrivacidadPage() {
  return (
    <main className="mx-auto w-full max-w-2xl px-5 py-12 sm:py-16">
      <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground sm:text-xs sm:tracking-[0.25em]">
        Protección de datos personales
      </p>
      <h1 className="mt-3 font-serif text-[2rem] leading-[1.1] text-foreground sm:text-4xl sm:leading-tight">
        Aviso de privacidad
      </h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Última actualización: {ULTIMA_ACTUALIZACION}
      </p>

      <div className="mt-8 grid gap-8 text-[15px] leading-relaxed text-muted-foreground">
        <section className="grid gap-2">
          <h2 className="font-serif text-xl text-foreground">
            Responsable del tratamiento
          </h2>
          <p>
            {RESPONSABLE.nombre} (en adelante, &ldquo;el Responsable&rdquo;), con
            domicilio en {RESPONSABLE.domicilio}, es responsable del tratamiento
            de tus datos personales conforme a la Ley Federal de Protección de
            Datos Personales en Posesión de los Particulares (LFPDPPP) y su
            normativa aplicable.
          </p>
        </section>

        <section className="grid gap-2">
          <h2 className="font-serif text-xl text-foreground">
            Datos que recabamos
          </h2>
          <p>
            Para coordinar el servicio en la asamblea recabamos: nombre y
            apellido, número de teléfono, congregación y tu disponibilidad. En
            el caso de capitanes y superintendentes, también un correo
            electrónico para crear tu cuenta de acceso.
          </p>
        </section>

        <section className="grid gap-2">
          <h2 className="font-serif text-xl text-foreground">
            Datos sensibles
          </h2>
          <p>
            Tu participación como voluntario revela tu{" "}
            <strong className="text-foreground">afiliación religiosa</strong>,
            que la LFPDPPP considera un dato personal sensible. Para tratar este
            dato requerimos tu consentimiento expreso, que otorgas al marcar la
            casilla correspondiente en el formulario de registro.
          </p>
        </section>

        <section className="grid gap-2">
          <h2 className="font-serif text-xl text-foreground">Finalidades</h2>
          <p>Tus datos se utilizan únicamente para:</p>
          <ul className="ml-5 list-disc grid gap-1">
            <li>Organizar y asignar el servicio dentro de la asamblea.</li>
            <li>Contactarte para coordinar tus turnos y asignaciones.</li>
            <li>Generar tu enlace o cuenta de acceso personal.</li>
            <li>Enviarte recordatorios y avisos relacionados con tu servicio.</li>
          </ul>
          <p>
            No utilizamos tus datos con fines de mercadotecnia ni los
            comercializamos.
          </p>
        </section>

        <section className="grid gap-2">
          <h2 className="font-serif text-xl text-foreground">Transferencias</h2>
          <p>
            No transferimos tus datos personales a terceros, salvo cuando sea
            necesario para cumplir una obligación legal o ante una autoridad
            competente. Nos apoyamos en proveedores de infraestructura
            tecnológica que actúan como encargados y tratan los datos por
            cuenta del Responsable.
          </p>
        </section>

        <section className="grid gap-2">
          <h2 className="font-serif text-xl text-foreground">
            Medidas de seguridad
          </h2>
          <p>
            Aplicamos medidas de seguridad administrativas, técnicas y físicas
            para proteger tus datos, incluyendo cifrado en tránsito (TLS),
            cifrado en reposo y controles de acceso. Conservamos tus datos solo
            mientras sean necesarios para las finalidades descritas.
          </p>
        </section>

        <section className="grid gap-2">
          <h2 className="font-serif text-xl text-foreground">
            Tus derechos (ARCO) y revocación
          </h2>
          <p>
            Tienes derecho a Acceder, Rectificar, Cancelar u Oponerte al
            tratamiento de tus datos personales, así como a revocar tu
            consentimiento en cualquier momento. Para ejercerlos, escribe a{" "}
            <a
              href={`mailto:${RESPONSABLE.contacto}`}
              className="underline underline-offset-2 hover:text-foreground"
            >
              {RESPONSABLE.contacto}
            </a>
            . También puedes pedirle a tu capitán que dé de baja tus datos del
            sistema.
          </p>
        </section>

        <section className="grid gap-2">
          <h2 className="font-serif text-xl text-foreground">
            Tecnologías de rastreo
          </h2>
          <p>
            Usamos una cookie técnica en tu dispositivo para vincular tu enlace
            de acceso personal de forma segura. No se utiliza para publicidad ni
            para rastrearte fuera de la plataforma.
          </p>
        </section>

        <section className="grid gap-2">
          <h2 className="font-serif text-xl text-foreground">
            Cambios a este aviso
          </h2>
          <p>
            Podemos actualizar este aviso de privacidad. Publicaremos cualquier
            cambio en esta misma página, indicando la fecha de la última
            actualización.
          </p>
        </section>
      </div>
    </main>
  )
}
