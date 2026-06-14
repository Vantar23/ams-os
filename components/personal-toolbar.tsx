"use client"

import {
  ChevronDownIcon,
  LinkIcon,
  MapPinIcon,
  PlusIcon,
  ShieldIcon,
  UserPlusIcon,
  UsersIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

/**
 * Toolbar de la sección Personal. Solo UI: el menú agrupa lo que se puede
 * hacer aquí (registrar personal, copiar el enlace de acceso y asignar a un
 * área). Las acciones aún no están conectadas.
 */
export function PersonalToolbar() {
  return (
    <div className="flex flex-col gap-3 rounded-xl border bg-surface p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
      <div className="min-w-0">
        <h2 className="text-sm font-medium text-foreground">
          Gestión de personal
        </h2>
        <p className="text-xs text-muted-foreground">
          Registra acomodadores, capitanes y hermanas de apoyo, copia su enlace
          de acceso y asígnalos a un área.
        </p>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="self-start sm:self-auto">
            <PlusIcon />
            Personal
            <ChevronDownIcon className="text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60">
          <DropdownMenuLabel>Registrar</DropdownMenuLabel>
          <DropdownMenuGroup>
            <DropdownMenuItem>
              <ShieldIcon />
              Capitán
            </DropdownMenuItem>
            <DropdownMenuItem>
              <UserPlusIcon />
              Acomodador
            </DropdownMenuItem>
            <DropdownMenuItem>
              <UsersIcon />
              Hermana de apoyo
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem>
            <LinkIcon />
            Copiar enlace de acceso
          </DropdownMenuItem>
          <DropdownMenuItem>
            <MapPinIcon />
            Asignar a un área
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
