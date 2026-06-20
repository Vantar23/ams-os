# Cumplimiento LFPDPPP — estado

Checklist práctico de cumplimiento de la Ley Federal de Protección de Datos
Personales en Posesión de los Particulares para esta plataforma. No sustituye
asesoría legal: la parte formal (aviso, consentimiento, documento de
seguridad) debe validarla un abogado en protección de datos.

## Hecho en código

- [x] **Aviso de privacidad** — página pública en `/aviso-de-privacidad`
  (`app/aviso-de-privacidad/page.tsx`). Responsable: David Antonio Arenas.
- [x] **Consentimiento en el registro** — casilla obligatoria que enlaza al
  aviso y cubre el dato sensible (afiliación religiosa), en los 4 formularios
  de registro (acomodadores, hermanas, capitanes, sub-aux). El envío —y la
  creación de cuenta— se bloquea hasta aceptar.
  Componente: `components/consentimiento-field.tsx`.
- [x] **Derechos ARCO (Cancelación)** — ya existía: borrado por persona desde
  el panel (`eliminarAcomodador`, `eliminarHermana`, `eliminarCapitan`).
- [x] **Revocación de acceso** — ya existía: regenerar enlace
  (`regenerarAcceso`, `regenerarAccesoHermana`) invalida un token filtrado.
- [x] **Cifrado en tránsito** (TLS) y **en reposo a nivel disco** (Supabase).

## Pendiente que NO necesita el `db pull`

- [ ] **Texto legal revisado** por asesoría (el aviso es una plantilla).
- [ ] **Documento de seguridad** y **política de retención** (organizativo).
- [ ] **Protocolo de notificación de brechas** (organizativo).
- [ ] **Designar responsable/contacto** de datos personales.

## Pendiente que SÍ necesita el `db pull`

- [ ] **Registrar el consentimiento** (fecha/versión del aviso aceptado) por
  persona. Hoy la casilla bloquea el envío pero no se persiste el registro,
  porque guardar esa marca requiere una columna nueva y tocar los RPC de
  registro, que viven solo en la BD. Pendiente junto al cifrado de campo.
- [ ] **Cifrado de campo** de telefono/nombre/apellido — ver
  `docs/pii-encryption-plan.md`.
- [ ] **Borrado en cascada**: confirmar que `eliminar*` borra también datos
  relacionados (asignaciones, mensajes, incidencias) según las llaves foráneas
  del esquema real.

## Notas

- La afiliación religiosa es **dato sensible** bajo LFPDPPP → el consentimiento
  expreso (la casilla) es obligatorio, no opcional.
- El aviso debe estar disponible **antes** de recabar datos: por eso se enlaza
  desde la propia casilla de registro.
