"use client"

import Link from "next/link"
import type { Control, FieldValues, Path } from "react-hook-form"

import { Checkbox } from "@/components/ui/checkbox"
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"

// Casilla de consentimiento para el tratamiento de datos personales,
// requerida por la LFPDPPP antes de recabar nombre, apellido y teléfono.
// La validación de "obligatorio" vive en el esquema zod de cada formulario
// (campo `consentimiento`), de modo que el envío —y, en su caso, la creación
// de la cuenta— se bloquea hasta que la persona acepte.
export function ConsentimientoField<T extends FieldValues>({
  control,
  name,
}: {
  control: Control<T>
  name: Path<T>
}) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className="grid gap-2">
          <div className="flex items-start gap-3">
            <FormControl>
              <Checkbox
                checked={Boolean(field.value)}
                onCheckedChange={field.onChange}
                className="mt-0.5"
              />
            </FormControl>
            <FormLabel className="text-xs font-normal leading-relaxed text-muted-foreground">
              He leído y acepto el{" "}
              <Link
                href="/aviso-de-privacidad"
                target="_blank"
                className="underline underline-offset-2 hover:text-foreground"
              >
                aviso de privacidad
              </Link>{" "}
              y doy mi consentimiento para el tratamiento de mis datos
              personales —incluido que mi participación revela mi afiliación
              religiosa— con el fin de organizar el servicio en la asamblea y
              que el departamento me contacte para coordinar mi asignación.
            </FormLabel>
          </div>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}
