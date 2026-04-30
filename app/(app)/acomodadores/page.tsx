"use client"

import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { CheckIcon, CopyIcon, LinkIcon, PlusIcon } from "lucide-react"

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
import { uid } from "@/lib/uid"

const acomodadorSchema = z.object({
  nombre: z.string().min(1, "Requerido"),
  apellido: z.string().min(1, "Requerido"),
  congregacion: z.string().min(1, "Requerido"),
  telefono: z.string().min(6, "Teléfono inválido"),
  notas: z.string().optional(),
})

type Acomodador = z.infer<typeof acomodadorSchema> & { id: string }

export default function AcomodadoresPage() {
  const [acomodadores, setAcomodadores] = React.useState<Acomodador[]>([])
  const [open, setOpen] = React.useState(false)
  const [shareOpen, setShareOpen] = React.useState(false)
  const [token, setToken] = React.useState("")
  const [copied, setCopied] = React.useState(false)

  React.useEffect(() => {
    if (shareOpen && !token) setToken(uid())
  }, [shareOpen, token])

  const origin = typeof window === "undefined" ? "" : window.location.origin
  const inviteUrl = token ? `${origin}/registro/acomodadores/${token}` : ""

  async function copyInvite() {
    if (!inviteUrl) return
    try {
      await navigator.clipboard.writeText(inviteUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* ignored */
    }
  }

  function regenerateInvite() {
    setToken(uid())
    setCopied(false)
  }

  const form = useForm<z.infer<typeof acomodadorSchema>>({
    resolver: zodResolver(acomodadorSchema),
    defaultValues: {
      nombre: "",
      apellido: "",
      congregacion: "",
      telefono: "",
      notas: "",
    },
  })

  function onSubmit(values: z.infer<typeof acomodadorSchema>) {
    setAcomodadores((prev) => [
      ...prev,
      { ...values, id: uid() },
    ])
    form.reset()
    setOpen(false)
  }

  return (
    <>
      <PageHeader parent="Personal" title="Acomodadores" />
      <div className="flex flex-1 flex-col gap-4 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Acomodadores</h2>
            <p className="text-sm text-muted-foreground">
              {acomodadores.length} hermano{acomodadores.length === 1 ? "" : "s"}{" "}
              registrado{acomodadores.length === 1 ? "" : "s"}
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShareOpen(true)}
              className="w-full sm:w-auto"
            >
              <LinkIcon />
              Compartir enlace
            </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="w-full sm:w-auto">
                <PlusIcon />
                Agregar acomodador
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Nuevo acomodador</DialogTitle>
                <DialogDescription>
                  Registra a un hermano que servirá durante la asamblea.
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="grid gap-4"
                >
                  <div className="grid gap-3 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="nombre"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nombre</FormLabel>
                          <FormControl>
                            <Input placeholder="Juan" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="apellido"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Apellido</FormLabel>
                          <FormControl>
                            <Input placeholder="Pérez" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="congregacion"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Congregación</FormLabel>
                        <FormControl>
                          <Input placeholder="Centro" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="telefono"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Teléfono</FormLabel>
                        <FormControl>
                          <Input
                            type="tel"
                            placeholder="+52 55 1234 5678"
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
                        <FormLabel>Notas</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Disponibilidad, restricciones, etc."
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

          <Dialog open={shareOpen} onOpenChange={setShareOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Compartir enlace de registro</DialogTitle>
                <DialogDescription>
                  Envíalo a los hermanos. Al abrirlo desde su teléfono, llenan
                  sus datos y aparecen aquí como acomodadores.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-3">
                <p className="text-xs uppercase tracking-[0.15em] text-muted-foreground">
                  Enlace
                </p>
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={inviteUrl}
                    className="font-mono text-xs"
                    onFocus={(e) => e.currentTarget.select()}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={copyInvite}
                    aria-label={copied ? "Copiado" : "Copiar enlace"}
                  >
                    {copied ? <CheckIcon /> : <CopyIcon />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Cualquier persona con este enlace podrá registrarse. Generar
                  uno nuevo invalida el anterior.
                </p>
              </div>
              <DialogFooter className="sm:justify-between">
                <Button
                  type="button"
                  variant="link"
                  onClick={regenerateInvite}
                  className="px-0 text-xs uppercase tracking-[0.15em] text-muted-foreground"
                >
                  Generar enlace nuevo
                </Button>
                <Button
                  type="button"
                  onClick={() => setShareOpen(false)}
                  className="w-full sm:w-auto"
                >
                  Listo
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="overflow-x-auto rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Congregación</TableHead>
                <TableHead>Teléfono</TableHead>
                <TableHead>Notas</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {acomodadores.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="h-24 text-center text-muted-foreground"
                  >
                    Sin acomodadores. Agrega el primero para comenzar.
                  </TableCell>
                </TableRow>
              ) : (
                acomodadores.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">
                      {a.nombre} {a.apellido}
                    </TableCell>
                    <TableCell>{a.congregacion}</TableCell>
                    <TableCell>
                      <a
                        href={`https://wa.me/${a.telefono.replace(/\D/g, "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline"
                      >
                        {a.telefono}
                      </a>
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
