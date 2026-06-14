"use client"

import * as React from "react"
import * as THREE from "three"
import { Canvas, extend, useFrame, useThree, type ThreeElement } from "@react-three/fiber"
import { Environment, Lightformer, RoundedBox } from "@react-three/drei"
import {
  BallCollider,
  CuboidCollider,
  Physics,
  RigidBody,
  useRopeJoint,
  useSphericalJoint,
  type RapierRigidBody,
} from "@react-three/rapier"
import { MeshLineGeometry, MeshLineMaterial } from "meshline"

import type { Pase } from "./load"

// Registra los elementos de meshline como intrinsics de R3F y los tipa.
extend({ MeshLineGeometry, MeshLineMaterial })
declare module "@react-three/fiber" {
  interface ThreeElements {
    meshLineGeometry: ThreeElement<typeof MeshLineGeometry>
    meshLineMaterial: ThreeElement<typeof MeshLineMaterial>
  }
}

// Paleta institucional (app/globals.css). El sitio es de un solo tema.
const PALETTE = {
  background: "#faf8f3",
  foreground: "#2c2e2a",
  card: "#f2efe7",
  primary: "#6b7a5a",
  primaryForeground: "#faf8f3",
  accent: "#8b9474",
  mutedForeground: "#6b6e66",
  border: "#d9d4c7",
}

export type LanyardData = Pick<
  Pase,
  | "area_nombre"
  | "asamblea_numero"
  | "asamblea_edicion"
  | "asamblea_titulo"
  | "asamblea_sede"
  | "asamblea_fechas"
  | "nombre"
>

export default function Lanyard({ data }: { data: LanyardData }) {
  return (
    <Canvas
      camera={{ position: [0, 0, 13], fov: 25 }}
      gl={{ alpha: true, antialias: true }}
      className="!touch-none"
    >
      <ambientLight intensity={Math.PI} />
      <Physics interpolate gravity={[0, -40, 0]} timeStep={1 / 60}>
        <Band data={data} />
      </Physics>
      <Environment blur={0.75}>
        <Lightformer
          intensity={2}
          color="white"
          position={[0, -1, 5]}
          rotation={[0, 0, Math.PI / 3]}
          scale={[100, 0.1, 1]}
        />
        <Lightformer
          intensity={3}
          color="white"
          position={[-1, -1, 1]}
          rotation={[0, 0, Math.PI / 3]}
          scale={[100, 0.1, 1]}
        />
        <Lightformer
          intensity={3}
          color="white"
          position={[1, 1, 1]}
          rotation={[0, 0, Math.PI / 3]}
          scale={[100, 0.1, 1]}
        />
        <Lightformer
          intensity={10}
          color="white"
          position={[-10, 0, 14]}
          rotation={[0, Math.PI / 2, Math.PI / 3]}
          scale={[100, 10, 1]}
        />
      </Environment>
    </Canvas>
  )
}

function Band({ data }: { data: LanyardData }) {
  const band = React.useRef<THREE.Mesh>(null)
  const fixed = React.useRef<RapierRigidBody>(null!)
  const j1 = React.useRef<RapierRigidBody>(null!)
  const j2 = React.useRef<RapierRigidBody>(null!)
  const j3 = React.useRef<RapierRigidBody>(null!)
  const card = React.useRef<RapierRigidBody>(null!)

  const vec = React.useMemo(() => new THREE.Vector3(), [])
  const ang = React.useMemo(() => new THREE.Vector3(), [])
  const rot = React.useMemo(() => new THREE.Vector3(), [])
  const dir = React.useMemo(() => new THREE.Vector3(), [])

  const segmentProps = {
    type: "dynamic" as const,
    canSleep: true,
    colliders: false as const,
    angularDamping: 2,
    linearDamping: 2,
  }

  const { width, height } = useThree((s) => s.size)
  const [dragged, drag] = React.useState<false | THREE.Vector3>(false)
  const [hovered, hover] = React.useState(false)

  const curve = React.useMemo(() => {
    const c = new THREE.CatmullRomCurve3([
      new THREE.Vector3(),
      new THREE.Vector3(),
      new THREE.Vector3(),
      new THREE.Vector3(),
    ])
    c.curveType = "chordal"
    return c
  }, [])

  const cardTexture = React.useMemo(() => makeCardTexture(data), [data])
  React.useEffect(() => () => cardTexture.dispose(), [cardTexture])

  useRopeJoint(fixed, j1, [[0, 0, 0], [0, 0, 0], 1])
  useRopeJoint(j1, j2, [[0, 0, 0], [0, 0, 0], 1])
  useRopeJoint(j2, j3, [[0, 0, 0], [0, 0, 0], 1])
  useSphericalJoint(j3, card, [[0, 0, 0], [0, 1.45, 0]])

  React.useEffect(() => {
    if (hovered) {
      document.body.style.cursor = dragged ? "grabbing" : "grab"
      return () => {
        document.body.style.cursor = "auto"
      }
    }
  }, [hovered, dragged])

  useFrame((state, delta) => {
    if (dragged && card.current) {
      vec.set(state.pointer.x, state.pointer.y, 0.5).unproject(state.camera)
      dir.copy(vec).sub(state.camera.position).normalize()
      vec.add(dir.multiplyScalar(state.camera.position.length()))
      ;[card, j1, j2, j3, fixed].forEach((r) => r.current?.wakeUp())
      card.current.setNextKinematicTranslation({
        x: vec.x - dragged.x,
        y: vec.y - dragged.y,
        z: vec.z - dragged.z,
      })
    }
    if (fixed.current && j1.current && j2.current && j3.current && band.current) {
      // Suaviza el movimiento del cordón con un pequeño lerp por segmento.
      ;[j1, j2].forEach((r) => {
        const rc = r.current as RapierRigidBody & { lerped?: THREE.Vector3 }
        if (!rc.lerped) rc.lerped = new THREE.Vector3().copy(rc.translation())
        const dist = Math.max(
          0.1,
          Math.min(1, rc.lerped.distanceTo(rc.translation())),
        )
        rc.lerped.lerp(rc.translation(), delta * (10 + dist * 40))
      })
      curve.points[0].copy(j3.current.translation())
      curve.points[1].copy(
        (j2.current as RapierRigidBody & { lerped: THREE.Vector3 }).lerped,
      )
      curve.points[2].copy(
        (j1.current as RapierRigidBody & { lerped: THREE.Vector3 }).lerped,
      )
      curve.points[3].copy(fixed.current.translation())
      ;(
        band.current.geometry as unknown as {
          setPoints: (p: THREE.Vector3[]) => void
        }
      ).setPoints(curve.getPoints(32))
      // Frena el giro del carnet para que se asiente.
      if (card.current) {
        ang.copy(card.current.angvel() as THREE.Vector3)
        rot.copy(card.current.rotation() as unknown as THREE.Vector3)
        card.current.setAngvel(
          { x: ang.x, y: ang.y - rot.y * 0.25, z: ang.z },
          true,
        )
      }
    }
  })

  return (
    <>
      <group position={[0, 4, 0]}>
        <RigidBody ref={fixed} {...segmentProps} type="fixed" />
        <RigidBody position={[0.5, 0, 0]} ref={j1} {...segmentProps}>
          <BallCollider args={[0.1]} />
        </RigidBody>
        <RigidBody position={[1, 0, 0]} ref={j2} {...segmentProps}>
          <BallCollider args={[0.1]} />
        </RigidBody>
        <RigidBody position={[1.5, 0, 0]} ref={j3} {...segmentProps}>
          <BallCollider args={[0.1]} />
        </RigidBody>
        <RigidBody
          position={[2, 0, 0]}
          ref={card}
          {...segmentProps}
          type={dragged ? "kinematicPosition" : "dynamic"}
        >
          <CuboidCollider args={[0.8, 1.125, 0.02]} />
          <group
            onPointerOver={() => hover(true)}
            onPointerOut={() => hover(false)}
            onPointerUp={(e) => {
              ;(e.target as Element).releasePointerCapture?.(e.pointerId)
              drag(false)
            }}
            onPointerDown={(e) => {
              ;(e.target as Element).setPointerCapture?.(e.pointerId)
              if (card.current) {
                drag(
                  new THREE.Vector3()
                    .copy(e.point)
                    .sub(vec.copy(card.current.translation())),
                )
              }
            }}
          >
            {/* Cuerpo del carnet */}
            <RoundedBox args={[1.6, 2.25, 0.04]} radius={0.08} smoothness={4}>
              <meshPhysicalMaterial
                map={cardTexture}
                clearcoat={0.9}
                clearcoatRoughness={0.2}
                roughness={0.4}
                metalness={0.1}
              />
            </RoundedBox>
            {/* Clip metálico que une al cordón */}
            <mesh position={[0, 1.2, 0]}>
              <torusGeometry args={[0.12, 0.04, 12, 32]} />
              <meshStandardMaterial
                color="#c9c4b6"
                metalness={0.9}
                roughness={0.3}
              />
            </mesh>
          </group>
        </RigidBody>
      </group>
      <mesh ref={band}>
        <meshLineGeometry />
        <meshLineMaterial
          args={[{ resolution: new THREE.Vector2(width, height) }]}
          color={PALETTE.primary}
          depthTest={false}
          resolution={[width, height]}
          lineWidth={0.45}
        />
      </mesh>
    </>
  )
}

// Dibuja la cara del carnet con los estilos del sitio sobre un canvas y la
// devuelve como textura. Relación ~0.71 para encajar con el carnet (1.6×2.25).
function makeCardTexture(data: LanyardData): THREE.CanvasTexture {
  const W = 1024
  const H = 1440
  const canvas = document.createElement("canvas")
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext("2d")!

  const serif = "Georgia, 'Times New Roman', serif"
  const sans = "system-ui, -apple-system, 'Segoe UI', sans-serif"

  // Fondo del carnet
  ctx.fillStyle = PALETTE.card
  ctx.fillRect(0, 0, W, H)

  // Encabezado sage
  const headerH = 300
  ctx.fillStyle = PALETTE.primary
  ctx.fillRect(0, 0, W, headerH)

  ctx.fillStyle = PALETTE.primaryForeground
  ctx.textBaseline = "alphabetic"
  ctx.textAlign = "left"
  ctx.font = `600 34px ${sans}`
  ctx.letterSpacing = "10px"
  ctx.fillText("PASE DE ACCESO", 72, 130)
  ctx.letterSpacing = "0px"
  ctx.globalAlpha = 0.9
  ctx.font = `28px ${sans}`
  ctx.fillText(
    `Asamblea N° ${data.asamblea_numero} — ${data.asamblea_edicion}`,
    72,
    200,
  )
  ctx.globalAlpha = 1

  // Insignia circular con check
  const cx = 150
  const cy = headerH + 150
  ctx.beginPath()
  ctx.arc(cx, cy, 70, 0, Math.PI * 2)
  ctx.fillStyle = withAlpha(PALETTE.primary, 0.12)
  ctx.fill()
  ctx.strokeStyle = PALETTE.primary
  ctx.lineWidth = 12
  ctx.lineCap = "round"
  ctx.lineJoin = "round"
  ctx.beginPath()
  ctx.moveTo(cx - 30, cy + 4)
  ctx.lineTo(cx - 8, cy + 28)
  ctx.lineTo(cx + 34, cy - 26)
  ctx.stroke()

  // Nombre del área (serif, puede ir en dos líneas)
  ctx.fillStyle = PALETTE.foreground
  ctx.textAlign = "left"
  const areaLines = wrapText(ctx, data.area_nombre, `64px ${serif}`, W - 144)
  ctx.font = `64px ${serif}`
  let y = headerH + 300
  for (const line of areaLines.slice(0, 2)) {
    ctx.fillText(line, 72, y)
    y += 78
  }

  // Pastilla "Acceso autorizado"
  y += 8
  ctx.font = `600 28px ${sans}`
  const pillText = "Acceso autorizado"
  const pillW = ctx.measureText(pillText).width + 90
  const pillH = 64
  roundRect(ctx, 72, y, pillW, pillH, 32)
  ctx.fillStyle = withAlpha(PALETTE.primary, 0.12)
  ctx.fill()
  ctx.fillStyle = PALETTE.primary
  ctx.fillText(pillText, 124, y + 42)
  // punto check de la pastilla
  ctx.beginPath()
  ctx.arc(96, y + 32, 8, 0, Math.PI * 2)
  ctx.fill()

  y += pillH + 70

  // Datos: portador, sede, fechas
  ctx.textAlign = "left"
  const filas: [string, string][] = []
  if (data.nombre) filas.push(["PORTADOR", data.nombre])
  if (data.asamblea_sede) filas.push(["SEDE", data.asamblea_sede])
  if (data.asamblea_fechas) filas.push(["FECHAS", data.asamblea_fechas])

  for (const [label, value] of filas) {
    ctx.fillStyle = PALETTE.mutedForeground
    ctx.font = `500 22px ${sans}`
    ctx.letterSpacing = "3px"
    ctx.fillText(label.toUpperCase(), 72, y)
    ctx.letterSpacing = "0px"
    ctx.fillStyle = PALETTE.foreground
    ctx.font = `34px ${sans}`
    const valueLines = wrapText(ctx, value, `34px ${sans}`, W - 144)
    let vy = y + 44
    for (const line of valueLines.slice(0, 2)) {
      ctx.fillText(line, 72, vy)
      vy += 44
    }
    y = vy + 30
  }

  // Pie
  ctx.strokeStyle = PALETTE.border
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(72, H - 130)
  ctx.lineTo(W - 72, H - 130)
  ctx.stroke()
  ctx.fillStyle = PALETTE.mutedForeground
  ctx.font = `24px ${sans}`
  ctx.fillText("Ligado a este dispositivo · solo funciona aquí", 72, H - 80)

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 8
  texture.needsUpdate = true
  return texture
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  font: string,
  maxWidth: number,
): string[] {
  ctx.font = font
  const words = text.split(/\s+/)
  const lines: string[] = []
  let current = ""
  for (const word of words) {
    const test = current ? `${current} ${word}` : word
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current)
      current = word
    } else {
      current = test
    }
  }
  if (current) lines.push(current)
  return lines
}

function withAlpha(hex: string, alpha: number): string {
  const h = hex.replace("#", "")
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}
