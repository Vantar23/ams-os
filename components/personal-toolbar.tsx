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
 * Botón desplegable de la sección Personal. Solo UI: el menú agrupa lo que se
 * puede hacer aquí (registrar personal, copiar el enlace de acceso y asignar a
 * un área). Las acciones aún no están conectadas.
 */
export function PersonalToolbar() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="shrink-0">
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
  )
}
