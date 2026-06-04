"use client"

import {
  HandHelpingIcon,
  HeartHandshakeIcon,
  SearchIcon,
  ShieldAlertIcon,
  TriangleAlertIcon,
} from "lucide-react"

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

function Bullets({ items }: { items: string[] }) {
  return (
    <ul className="space-y-1.5">
      {items.map((item, i) => (
        <li key={i} className="flex gap-2.5 text-muted-foreground">
          <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary/60" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  )
}

function Steps({ items }: { items: string[] }) {
  return (
    <ol className="space-y-2">
      {items.map((item, i) => (
        <li key={i} className="flex gap-3 text-muted-foreground">
          <span className="inline-flex size-5 shrink-0 items-center justify-center rounded-full border border-primary/40 bg-primary/10 text-[11px] font-medium text-primary">
            {i + 1}
          </span>
          <span className="pt-px">{item}</span>
        </li>
      ))}
    </ol>
  )
}

function Subheading({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground/70">
      {children}
    </p>
  )
}

export function PautasAcomodadores() {
  return (
    <div className="text-sm">
      <p className="text-muted-foreground">
        Resumen de pautas y responsabilidades basadas en los videos del curso
        diseñado por la organización para el buen funcionamiento del
        departamento.
      </p>

      <blockquote className="mt-6 rounded-xl border-l-2 border-primary/50 bg-surface py-3 pl-4 pr-3 italic text-foreground/80">
        «Y cada uno de ellos será como un refugio contra el viento, un refugio
        contra la tormenta de lluvia, como corrientes de agua en una tierra
        árida, como la sombra de un peñasco inmenso en una tierra reseca».
        <span className="mt-1 block text-xs not-italic text-muted-foreground">
          Isaías 32:2
        </span>
      </blockquote>

      <p className="mt-6 font-medium text-foreground">
        Los acomodadores somos hombres espirituales:
      </p>
      <ul className="mt-3 space-y-1.5">
        {[
          "Lo que implica servir de acomodador en asambleas regionales y de circuito.",
          "Se rige por principios bíblicos.",
          "Maduro y confía en Jehová.",
          "Cortés y amable.",
          "Apropiadamente vestidos y arreglados.",
        ].map((item) => (
          <li key={item} className="flex gap-2.5 text-muted-foreground">
            <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary/60" />
            <span>{item}</span>
          </li>
        ))}
      </ul>

      <p className="mt-8 text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground/70">
        Pautas por apartado
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        Toca cada apartado para repasarlo.
      </p>

      <Accordion type="single" collapsible className="mt-4 grid gap-3">
        <AccordionItem value="deberes">
          <AccordionTrigger>
            <span className="flex items-center gap-3">
              <HandHelpingIcon className="size-5 shrink-0 text-primary" />
              Deberes
            </span>
          </AccordionTrigger>
          <AccordionContent className="space-y-4">
            <p className="text-muted-foreground">
              Tomar la iniciativa en ayudar y esforzarnos por atender las
              necesidades de los demás:
            </p>
            <Bullets
              items={[
                "Tener en cuenta las circunstancias particulares de cada persona.",
                "Ser flexibles.",
                "Ayudar a todos a beneficiarse del programa espiritual.",
                "Ver cada caso como una situación singular.",
                "Manifestar amor y empatía.",
                "Atender sus necesidades particulares.",
                "Ser refrescantes como Jesús.",
              ]}
            />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="accidentes">
          <AccordionTrigger>
            <span className="flex items-center gap-3">
              <TriangleAlertIcon className="size-5 shrink-0 text-primary" />
              Accidentes
            </span>
          </AccordionTrigger>
          <AccordionContent className="space-y-4">
            <p className="text-muted-foreground">
              El objetivo es prevenir accidentes. En caso de accidente:
            </p>
            <Steps
              items={[
                "Determinar si se necesitan primeros auxilios.",
                "Comunicarse con primeros auxilios.",
                "Respuesta inmediata de los acomodadores cercanos.",
                "Dirigir a la multitud.",
                "Proporcionar detalles adicionales a primeros auxilios y a la sección de acomodadores.",
                "Recordar a la persona lastimada que no debe moverse para evitar mayores lesiones.",
                "Buscar a la familia y a los ancianos de su congregación.",
                "Transferir el manejo de la situación al personal de primeros auxilios.",
                "Informar a primeros auxilios si hay testigos del accidente.",
              ]}
            />
            <div className="space-y-2 border-t border-border pt-3">
              <Subheading>Después del incidente</Subheading>
              <Bullets
                items={[
                  "Determinar qué contribuyó a que ocurriera el accidente.",
                  "Tomar medidas correctivas.",
                  "Preparar un informe para el Comité de Asambleas.",
                ]}
              />
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="ninos">
          <AccordionTrigger>
            <span className="flex items-center gap-3">
              <SearchIcon className="size-5 shrink-0 text-primary" />
              Niños extraviados
            </span>
          </AccordionTrigger>
          <AccordionContent>
            <Bullets
              items={[
                "La madre alerta del extravío.",
                "Llamar a objetos perdidos.",
                "En caso de no estar, llamar al departamento de acomodadores.",
                "Enviar mensaje a todos los acomodadores con foto y detalles.",
                "Llamar al superintendente de estacionamiento.",
                "El acomodador que encuentra al niño lo informa al departamento.",
              ]}
            />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="sospechosas">
          <AccordionTrigger>
            <span className="flex items-center gap-3">
              <ShieldAlertIcon className="size-5 shrink-0 text-primary" />
              Personas sospechosas
            </span>
          </AccordionTrigger>
          <AccordionContent className="space-y-4">
            <p className="text-muted-foreground">
              Tratar de manera amable pero firme a un sospechoso. Fijarse en:
            </p>
            <Bullets
              items={[
                "Su apariencia.",
                "Sus expresiones faciales.",
                "Su falta de comunicación.",
                "Su reacción negativa cuando se le ofrece un programa.",
                "Estar siempre alertas.",
              ]}
            />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="actividades">
          <AccordionTrigger>
            <span className="flex items-center gap-3">
              <HeartHandshakeIcon className="size-5 shrink-0 text-primary" />
              Actividades durante la asamblea
            </span>
          </AccordionTrigger>
          <AccordionContent className="space-y-4">
            <div className="space-y-2">
              <Subheading>Antes de la asamblea</Subheading>
              <Bullets
                items={[
                  "Estar atentos para ayudar a los hermanos que lo requieran en las entradas del local.",
                  "Ofrecer información y guía.",
                  "Organizar filas para entrar: 8:00 a. m. necesidades especiales y 8:15 a. m. general.",
                  "Asegurar el orden en la entrada y salida de asistentes.",
                ]}
              />
            </div>
            <div className="space-y-2 border-t border-border pt-3">
              <Subheading>Durante la asamblea</Subheading>
              <Bullets
                items={[
                  "Mantener las filas en orden.",
                  "Controlar el flujo de personas.",
                  "Controlar y asegurar puertas.",
                  "Asegurar el buen uso de las escaleras eléctricas y rampas.",
                  "Asegurar el buen servicio de ascensores.",
                  "Ayudar a los asistentes a encontrar asientos.",
                  "Reservar asientos para personas mayores y de salud delicada.",
                  "Proveer recordatorios en cuanto a seguridad.",
                  "Eliminar posibles causas de tropiezo.",
                  "Controlar la plataforma y sus inmediaciones.",
                  "Mantener vigilancia en todo momento.",
                  "Impedir el acceso no autorizado a la plataforma.",
                  "Dirigir a los candidatos de bautismo a los vestidores.",
                  "Mantener el entorno seguro.",
                  "Organizar a los observadores del bautismo.",
                ]}
              />
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  )
}
