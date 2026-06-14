"use client"

import * as React from "react"
import * as THREE from "three"
import {
  Canvas,
  extend,
  useFrame,
  type ThreeElement,
} from "@react-three/fiber"
import { Environment, Lightformer, useGLTF, useTexture } from "@react-three/drei"
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

const CARD_GLB = "/lanyard/card.glb"
useGLTF.preload(CARD_GLB)

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

// El frente del modelo está mapeado a la mitad IZQUIERDA del atlas de textura y
// el reverso a la mitad DERECHA (medido del card.glb). Cada imagen se compone en
// su mitad respetando proporción.
const FRONT_UV_RECT = { x: 0, y: 0, w: 0.5, h: 0.755 }
const BACK_UV_RECT = { x: 0.5, y: 0, w: 0.5, h: 0.757 }

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
  const [isMobile, setIsMobile] = React.useState(
    () => typeof window !== "undefined" && window.innerWidth < 768,
  )
  React.useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener("resize", onResize)
    return () => window.removeEventListener("resize", onResize)
  }, [])

  const frontImage = React.useMemo(() => makeFrontFace(data), [data])
  const backImage = React.useMemo(() => makeBackFace(data), [data])

  return (
    <Canvas
      camera={{ position: [0, 0, 9.5], fov: 25 }}
      dpr={[1, isMobile ? 1.5 : 2]}
      gl={{ alpha: true }}
      className="!touch-none"
      onCreated={({ gl }) => gl.setClearColor(new THREE.Color(0x000000), 0)}
    >
      <ambientLight intensity={Math.PI} />
      <React.Suspense fallback={null}>
        <Physics gravity={[0, -40, 0]} timeStep={isMobile ? 1 / 30 : 1 / 60}>
          <Band
            isMobile={isMobile}
            frontImage={frontImage}
            backImage={backImage}
          />
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
      </React.Suspense>
    </Canvas>
  )
}

type GLTFResult = {
  nodes: Record<string, THREE.Mesh>
  materials: Record<string, THREE.MeshStandardMaterial>
}

function Band({
  isMobile = false,
  frontImage,
  backImage,
  maxSpeed = 50,
  minSpeed = 0,
}: {
  isMobile?: boolean
  frontImage: string
  backImage: string
  maxSpeed?: number
  minSpeed?: number
}) {
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
    angularDamping: 4,
    linearDamping: 4,
  }

  const { nodes, materials } = useGLTF(CARD_GLB) as unknown as GLTFResult
  const frontTex = useTexture(frontImage)
  const backTex = useTexture(backImage)

  // Compone las caras (frente = mitad izquierda del atlas, reverso = derecha)
  // sobre la textura base del modelo, respetando proporción (sin estirar).
  const cardMap = React.useMemo(() => {
    const baseMap = materials.base.map
    const baseImg = baseMap?.image as HTMLImageElement | undefined
    if (!baseMap || !baseImg) return baseMap ?? null
    const W = baseImg.width
    const H = baseImg.height
    const canvas = document.createElement("canvas")
    canvas.width = W
    canvas.height = H
    const ctx = canvas.getContext("2d")
    if (!ctx) return baseMap
    ctx.drawImage(baseImg, 0, 0, W, H)

    const drawFitted = (
      img: HTMLImageElement,
      rect: { x: number; y: number; w: number; h: number },
    ) => {
      const rx = rect.x * W
      const ry = rect.y * H
      const rw = rect.w * W
      const rh = rect.h * H
      const scale = Math.max(rw / img.width, rh / img.height) // cover
      const dw = img.width * scale
      const dh = img.height * scale
      const dx = rx + (rw - dw) / 2
      const dy = ry + (rh - dh) / 2
      ctx.save()
      ctx.beginPath()
      ctx.rect(rx, ry, rw, rh)
      ctx.clip()
      ctx.drawImage(img, dx, dy, dw, dh)
      ctx.restore()
    }

    if (frontTex.image) drawFitted(frontTex.image as HTMLImageElement, FRONT_UV_RECT)
    if (backTex.image) drawFitted(backTex.image as HTMLImageElement, BACK_UV_RECT)

    const composite = new THREE.CanvasTexture(canvas)
    composite.colorSpace = THREE.SRGBColorSpace
    composite.flipY = baseMap.flipY
    composite.anisotropy = 16
    composite.needsUpdate = true
    return composite
  }, [frontTex, backTex, materials.base.map])

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

  const [dragged, drag] = React.useState<false | THREE.Vector3>(false)
  const [hovered, hover] = React.useState(false)

  useRopeJoint(fixed, j1, [[0, 0, 0], [0, 0, 0], 0.6])
  useRopeJoint(j1, j2, [[0, 0, 0], [0, 0, 0], 0.6])
  useRopeJoint(j2, j3, [[0, 0, 0], [0, 0, 0], 0.6])
  useSphericalJoint(j3, card, [[0, 0, 0], [0, 1.5, 0]])

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
      ;[j1, j2].forEach((r) => {
        const rc = r.current as RapierRigidBody & { lerped?: THREE.Vector3 }
        if (!rc.lerped) rc.lerped = new THREE.Vector3().copy(rc.translation())
        const dist = Math.max(
          0.1,
          Math.min(1, rc.lerped.distanceTo(rc.translation())),
        )
        rc.lerped.lerp(
          rc.translation(),
          delta * (minSpeed + dist * (maxSpeed - minSpeed)),
        )
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
      ).setPoints(curve.getPoints(isMobile ? 16 : 32))
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
      <group position={[0, 3.2, 0]}>
        <RigidBody ref={fixed} {...segmentProps} type="fixed" />
        <RigidBody position={[0.4, 0, 0]} ref={j1} {...segmentProps}>
          <BallCollider args={[0.1]} />
        </RigidBody>
        <RigidBody position={[0.8, 0, 0]} ref={j2} {...segmentProps}>
          <BallCollider args={[0.1]} />
        </RigidBody>
        <RigidBody position={[1.2, 0, 0]} ref={j3} {...segmentProps}>
          <BallCollider args={[0.1]} />
        </RigidBody>
        <RigidBody
          position={[1.6, 0, 0]}
          ref={card}
          {...segmentProps}
          type={dragged ? "kinematicPosition" : "dynamic"}
        >
          <CuboidCollider args={[0.8, 1.125, 0.01]} />
          <group
            scale={2.25}
            position={[0, -1.2, -0.05]}
            onPointerOver={() => hover(true)}
            onPointerOut={() => hover(false)}
            onPointerCancel={() => drag(false)}
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
            <mesh geometry={nodes.card.geometry}>
              <meshPhysicalMaterial
                map={cardMap}
                map-anisotropy={16}
                clearcoat={isMobile ? 0 : 1}
                clearcoatRoughness={0.15}
                roughness={0.9}
                metalness={0.8}
              />
            </mesh>
            <mesh
              geometry={nodes.clip.geometry}
              material={materials.metal}
              material-roughness={0.3}
            />
            <mesh geometry={nodes.clamp.geometry} material={materials.metal} />
          </group>
        </RigidBody>
      </group>
      <mesh ref={band}>
        <meshLineGeometry />
        <meshLineMaterial
          args={[{ resolution: new THREE.Vector2(1000, 1000) }]}
          color={PALETTE.primary}
          depthTest={false}
          resolution={isMobile ? [1000, 2000] : [1000, 1000]}
          lineWidth={isMobile ? 0.7 : 0.6}
        />
      </mesh>
    </>
  )
}

// ── Generación de las caras del carnet con los estilos del sitio ────────────

const SERIF = "Georgia, 'Times New Roman', serif"
const SANS = "system-ui, -apple-system, 'Segoe UI', sans-serif"

/** Cara frontal: credencial completa. Devuelve un data URL PNG. */
function makeFrontFace(data: LanyardData): string {
  const W = 1024
  const H = 1448
  const { canvas, ctx } = newCanvas(W, H)

  ctx.fillStyle = PALETTE.card
  ctx.fillRect(0, 0, W, H)

  const headerH = 300
  ctx.fillStyle = PALETTE.primary
  ctx.fillRect(0, 0, W, headerH)

  ctx.fillStyle = PALETTE.primaryForeground
  ctx.textAlign = "left"
  ctx.font = `600 34px ${SANS}`
  setLetterSpacing(ctx, 10)
  ctx.fillText("PASE DE ACCESO", 72, 130)
  setLetterSpacing(ctx, 0)
  ctx.globalAlpha = 0.9
  ctx.font = `28px ${SANS}`
  ctx.fillText(
    `Asamblea N° ${data.asamblea_numero} — ${data.asamblea_edicion}`,
    72,
    200,
  )
  ctx.globalAlpha = 1

  // Insignia con check
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

  // Título: el nombre del portador si se registró; si no, el área.
  const holder = data.nombre?.trim()
  const titleText = holder || data.area_nombre
  ctx.fillStyle = PALETTE.foreground
  const titleLines = wrapText(ctx, titleText, `64px ${SERIF}`, W - 144)
  ctx.font = `64px ${SERIF}`
  let y = headerH + 290
  for (const line of titleLines.slice(0, 2)) {
    ctx.fillText(line, 72, y)
    y += 78
  }

  // Subtítulo: el área a la que accede (cuando el título es el nombre).
  if (holder) {
    ctx.fillStyle = PALETTE.mutedForeground
    ctx.font = `30px ${SANS}`
    const subLines = wrapText(ctx, `Acceso a ${data.area_nombre}`, `30px ${SANS}`, W - 144)
    for (const line of subLines.slice(0, 1)) {
      ctx.fillText(line, 72, y)
      y += 42
    }
  }

  // Pastilla
  y += 8
  ctx.font = `600 28px ${SANS}`
  const pillText = "Acceso autorizado"
  const pillW = ctx.measureText(pillText).width + 90
  const pillH = 64
  roundRect(ctx, 72, y, pillW, pillH, 32)
  ctx.fillStyle = withAlpha(PALETTE.primary, 0.12)
  ctx.fill()
  ctx.fillStyle = PALETTE.primary
  ctx.fillText(pillText, 124, y + 42)
  ctx.beginPath()
  ctx.arc(96, y + 32, 8, 0, Math.PI * 2)
  ctx.fill()
  y += pillH + 70

  // Datos (el portador ya es el título; no lo repetimos)
  const filas: [string, string][] = []
  if (data.asamblea_sede) filas.push(["SEDE", data.asamblea_sede])
  if (data.asamblea_fechas) filas.push(["FECHAS", data.asamblea_fechas])
  for (const [label, value] of filas) {
    ctx.fillStyle = PALETTE.mutedForeground
    ctx.font = `500 22px ${SANS}`
    setLetterSpacing(ctx, 3)
    ctx.fillText(label, 72, y)
    setLetterSpacing(ctx, 0)
    ctx.fillStyle = PALETTE.foreground
    ctx.font = `34px ${SANS}`
    const valueLines = wrapText(ctx, value, `34px ${SANS}`, W - 144)
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
  ctx.moveTo(72, H - 150)
  ctx.lineTo(W - 72, H - 150)
  ctx.stroke()
  ctx.fillStyle = PALETTE.mutedForeground
  ctx.font = `24px ${SANS}`
  ctx.fillText("Ligado a este dispositivo · solo funciona aquí", 72, H - 100)

  return canvas.toDataURL("image/png")
}

/** Reverso: sage con identidad sobria. */
function makeBackFace(data: LanyardData): string {
  const W = 1024
  const H = 1448
  const { canvas, ctx } = newCanvas(W, H)

  ctx.fillStyle = PALETTE.primary
  ctx.fillRect(0, 0, W, H)

  ctx.textAlign = "center"
  ctx.fillStyle = PALETTE.primaryForeground
  ctx.font = `600 64px ${SERIF}`
  ctx.fillText("AMS-OS", W / 2, H / 2 - 20)
  ctx.globalAlpha = 0.85
  ctx.font = `28px ${SANS}`
  setLetterSpacing(ctx, 6)
  ctx.fillText("GESTIÓN DE ASAMBLEAS", W / 2, H / 2 + 40)
  setLetterSpacing(ctx, 0)
  ctx.globalAlpha = 0.7
  ctx.font = `26px ${SANS}`
  ctx.fillText(
    `Asamblea N° ${data.asamblea_numero} — ${data.asamblea_edicion}`,
    W / 2,
    H - 140,
  )
  ctx.globalAlpha = 1

  return canvas.toDataURL("image/png")
}

function newCanvas(w: number, h: number) {
  const canvas = document.createElement("canvas")
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext("2d")!
  ctx.textBaseline = "alphabetic"
  return { canvas, ctx }
}

function setLetterSpacing(ctx: CanvasRenderingContext2D, px: number) {
  // letterSpacing existe en navegadores modernos; si no, se ignora.
  ;(ctx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing =
    `${px}px`
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
