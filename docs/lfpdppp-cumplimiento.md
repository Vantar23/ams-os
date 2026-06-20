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
- [x] **Datos de terceros — capa A (quien captura).** Casilla
  "Confirmo que tengo autorización de esta persona…" al dar de alta
  manualmente a un acomodador/hermana o al generar un pase con nombre/
  teléfono. Bloquea la acción hasta confirmar.
  Componente: `AutorizacionTercero` en `components/aviso-aceptacion.tsx`.
- [x] **Datos de terceros — capa B (el titular).** El aviso + aceptación
  aparece en el primer acceso a los portales (claim de acomodador, hermana y
  pase), para informar al titular en el primer contacto. Bloquea la
  confirmación del dispositivo hasta aceptar.
  Componente: `AvisoAceptacion` en `components/aviso-aceptacion.tsx`.
- [x] **Persistencia de consentimientos** — bitácora `consentimientos`
  (migración `20260620000002_consentimientos.sql`) donde el backend registra,
  con fecha, versión del aviso, user-agent e IP: el consentimiento al
  registrarse (`registro`), la autorización de quien captura datos de un
  tercero (`autorizacion_tercero`) y la aceptación en el primer acceso
  (`aviso_primer_acceso`). Helper: `lib/consentimiento.ts`. Es una tabla nueva
  e independiente, por eso **no** necesitó el `db pull`.
  ⚠️ Requiere aplicar la migración (`supabase db push`) para que los registros
  se guarden.
- [x] **Derechos ARCO (Cancelación) / borrado a solicitud** — borrado por
  persona desde el panel para los 4 roles (`eliminarAcomodador`,
  `eliminarHermana`, `eliminarCapitan`, `eliminarSubAux`) y para pases
  (`eliminarPase`). Las reglas de borrado de las tablas del repo son seguras
  (reportes/incidencias quedan con autor `NULL`; asignaciones/reemplazos/
  conteos en cascada). Al borrar también se **anonimiza** la bitácora
  `consentimientos` de esa persona (`anonimizarConsentimientos`), de modo que
  no queda PII tras la cancelación.
- [x] **Revocación de acceso** — ya existía: regenerar enlace
  (`regenerarAcceso`, `regenerarAccesoHermana`) invalida un token filtrado.
- [x] **Cifrado en tránsito** (TLS) y **en reposo a nivel disco** (Supabase).

## Pendiente que NO necesita el `db pull`

- [ ] **Texto legal revisado** por asesoría (el aviso es una plantilla).
- [ ] **Documento de seguridad** y **política de retención** (organizativo).
- [ ] **Protocolo de notificación de brechas** (organizativo).
- [ ] **Designar responsable/contacto** de datos personales.

## Pendiente que SÍ necesita el `db pull`

- [ ] **Cifrado de campo** de telefono/nombre/apellido — ver
  `docs/pii-encryption-plan.md`.
- [ ] **Borrado en cascada (verificación final)**: las FK del repo son
  seguras, pero conviene confirmar contra el esquema real que tablas base
  fuera del repo (p. ej. `asignaciones.acomodador_id`) tengan
  `on delete cascade`/`set null`, para que el borrado nunca falle por FK.

## Notas

- La afiliación religiosa es **dato sensible** bajo LFPDPPP → el consentimiento
  expreso (la casilla) es obligatorio, no opcional.
- El aviso debe estar disponible **antes** de recabar datos: por eso se enlaza
  desde la propia casilla de registro.
- Los teléfonos puramente operativos (primeros auxilios, seguridad, limpieza en
  `asambleas`; contactos de pase) son terceros que no usan el sistema: hay que
  informarles **por fuera** de la app; no se puede automatizar.
