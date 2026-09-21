"use client";

import { useRef, Suspense } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, MeshDistortMaterial, Sphere, Torus } from "@react-three/drei";
import type { Mesh } from "three";

function NetworkCore() {
  const coreRef = useRef<Mesh>(null);
  const ringRef = useRef<Mesh>(null);
  const outerRef = useRef<Mesh>(null);

  useFrame((_, delta) => {
    if (coreRef.current) {
      coreRef.current.rotation.y += delta * 0.35;
      coreRef.current.rotation.x += delta * 0.12;
    }
    if (ringRef.current) {
      ringRef.current.rotation.x += delta * 0.4;
      ringRef.current.rotation.z -= delta * 0.25;
    }
    if (outerRef.current) {
      outerRef.current.rotation.y -= delta * 0.2;
      outerRef.current.rotation.x += delta * 0.08;
    }
  });

  return (
    <Float speed={1.4} rotationIntensity={0.35} floatIntensity={0.6}>
      <Sphere ref={coreRef} args={[1.15, 64, 64]}>
        <MeshDistortMaterial
          color="#3b82f6"
          emissive="#1d4ed8"
          emissiveIntensity={0.55}
          roughness={0.15}
          metalness={0.7}
          distort={0.28}
          speed={2.2}
        />
      </Sphere>

      <Sphere args={[1.35, 48, 48]}>
        <meshStandardMaterial
          color="#22d3ee"
          transparent
          opacity={0.12}
          roughness={0.1}
          metalness={0.9}
        />
      </Sphere>

      <Torus ref={ringRef} args={[1.9, 0.035, 16, 100]} rotation={[Math.PI / 2.4, 0.4, 0]}>
        <meshStandardMaterial
          color="#22d3ee"
          emissive="#22d3ee"
          emissiveIntensity={1.2}
          roughness={0.2}
          metalness={0.8}
        />
      </Torus>

      <Torus ref={outerRef} args={[2.35, 0.02, 12, 120]} rotation={[0.6, 0.2, 0.9]}>
        <meshStandardMaterial
          color="#60a5fa"
          emissive="#3b82f6"
          emissiveIntensity={0.8}
          roughness={0.3}
          metalness={0.6}
        />
      </Torus>

      {[0, 1, 2, 3, 4, 5].map((i) => {
        const angle = (i / 6) * Math.PI * 2;
        const r = 2.35;
        return (
          <mesh
            key={i}
            position={[Math.cos(angle) * r, Math.sin(angle * 0.7) * 0.4, Math.sin(angle) * r]}
          >
            <sphereGeometry args={[0.08, 16, 16]} />
            <meshStandardMaterial color="#f59e0b" emissive="#f59e0b" emissiveIntensity={1.5} />
          </mesh>
        );
      })}
    </Float>
  );
}

function SceneLights() {
  return (
    <>
      <ambientLight intensity={0.35} />
      <directionalLight position={[5, 5, 5]} intensity={1.1} color="#bfdbfe" />
      <pointLight position={[-4, 2, -2]} intensity={1.4} color="#22d3ee" />
      <pointLight position={[3, -2, 4]} intensity={0.9} color="#3b82f6" />
    </>
  );
}

export default function ArcScene() {
  return (
    <div className="relative h-90 w-full sm:h-110 lg:h-130">
      <div className="pointer-events-none absolute inset-0 glow-orb" />
      <Canvas
        camera={{ position: [0, 0, 6.2], fov: 42 }}
        dpr={[1, 1.75]}
        gl={{ antialias: true, alpha: true }}
        style={{ background: "transparent" }}
      >
        <Suspense fallback={null}>
          <SceneLights />
          <NetworkCore />
        </Suspense>
      </Canvas>
    </div>
  );
}
