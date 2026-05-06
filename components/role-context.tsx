"use client"

import * as React from "react"

export type Role = "owner" | "capitan" | "subcapitan" | "auxiliar"

const RoleContext = React.createContext<Role | null>(null)

export function RoleProvider({
  role,
  children,
}: {
  role: Role | null
  children: React.ReactNode
}) {
  return <RoleContext.Provider value={role}>{children}</RoleContext.Provider>
}

export function useRole(): Role | null {
  return React.useContext(RoleContext)
}

export function roleLabel(role: Role | null): string | null {
  switch (role) {
    case "owner":
      return "Propietario"
    case "capitan":
      return "Capitán"
    case "subcapitan":
      return "Subcapitán"
    case "auxiliar":
      return "Auxiliar"
    default:
      return null
  }
}
