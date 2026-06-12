"use client"

import { ChatBase } from "@/components/chat-personal"
import {
  enviarMensajeCapitan,
  listarMensajesCapitan,
} from "@/lib/actions/portal-capitan"

/** Conversación del capitán con el equipo administrador (vía su sesión). */
export function ChatCapitan() {
  return <ChatBase listar={listarMensajesCapitan} enviar={enviarMensajeCapitan} />
}
