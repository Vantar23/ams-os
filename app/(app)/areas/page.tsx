"use client"

import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { PlusIcon } from "lucide-react"

import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useLocalStorage } from "@/lib/use-local-storage"
import { uid } from "@/lib/uid"

const areaSchema = z.object({
  nombre: z.string().min(1, "Requerido"),
  ubicacion: z.string().optional(),
  capacidad: z.string().optional(),
  notas: z.string().optional(),
})

type Area = z.infer<typeof areaSchema> & { id: string }

export default function AreasPage() {
  const [areas, setAreas] = useLocalStorage<Area[]>("ams-os.areas", [])
  const [open, setOpen] = React.useState(false)

  const form = useForm<z.infer<typeof areaSchema>>({
    resolver: zodResolver(areaSchema),
    defaultValues: {
      nombre: "",
      ubicacion: "",
      capacidad: "",
      notas: "",
    },
  })

  function onSubmit(values: z.infer<typeof areaSchema>) {
    setAreas((prev) => [...prev, { ...values, id: uid() }])
    form.reset()
    setOpen(false)
  }

  return (
    <>
      <PageHeader parent="Lugar" title="Áreas" />
      <div className="flex flex-1 flex-col gap-4 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Áreas</h2>
            <p className="text-sm text-muted-foreground">
              {areas.length} área{areas.length === 1 ? "" : "s"} registrada
              {areas.length === 1 ? "" : "s"}
            </p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="w-full sm:w-auto">
                <PlusIcon />
                Agregar área
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Nueva área</DialogTitle>
                <DialogDescription>
                  Registra una zona del lugar de la asamblea que requiera
                  acomodadores.
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="grid gap-4"
                >
                  <FormField
                    control={form.control}
                    name="nombre"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nombre</FormLabel>
                        <FormControl>
                          <Input placeholder="Sala principal" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="ubicacion"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Ubicación{" "}
                          <span className="text-muted-foreground">
                            (opcional)
                          </span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Planta baja, ala oeste"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="capacidad"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Capacidad{" "}
                          <span className="text-muted-foreground">
                            (opcional)
                          </span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="150 personas · 4 acomodadores"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="notas"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Notas{" "}
                          <span className="text-muted-foreground">
                            (opcional)
                          </span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Particularidades del área, etc."
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <DialogFooter>
                    <Button type="submit" className="w-full sm:w-auto">
                      Guardar
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="overflow-x-auto rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Ubicación</TableHead>
                <TableHead>Capacidad</TableHead>
                <TableHead>Notas</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {areas.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="h-24 text-center text-muted-foreground"
                  >
                    Sin áreas. Agrega la primera para comenzar.
                  </TableCell>
                </TableRow>
              ) : (
                areas.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{a.nombre}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {a.ubicacion || "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {a.capacidad || "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {a.notas || "—"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </>
  )
}
