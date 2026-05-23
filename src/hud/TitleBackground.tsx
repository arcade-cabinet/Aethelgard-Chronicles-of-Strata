import { Canvas, useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import { type Mesh, PCFSoftShadowMap } from 'three';

/** Slowly-rotating golden ocean disc beneath the camera (per spec — animated title). */
function GoldenOcean() {
  const ref = useRef<Mesh>(null);
  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 0.08;
  });
  return (
    <mesh ref={ref} position={[0, -1.5, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <cylinderGeometry args={[60, 60, 0.4, 8]} />
      <meshStandardMaterial color="#0ea5e9" roughness={0.2} flatShading />
    </mesh>
  );
}

/**
 * Decorative r3f background mounted under the TitleScreen (M_TITLE.1) —
 * a slowly rotating golden/blue ocean + a warm sky gradient via the Canvas
 * background. Visible THROUGH the title's translucent gradient overlay,
 * giving the launcher a living-world feel per the original conversation spec.
 */
export function TitleBackground() {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        // sits BEHIND the TitleScreen's gradient
        zIndex: -1,
        pointerEvents: 'none',
      }}
      aria-hidden="true"
    >
      <Canvas
        shadows={{ type: PCFSoftShadowMap }}
        camera={{ position: [0, 16, 24], fov: 55 }}
        style={{ position: 'absolute', inset: 0, background: '#0f172a' }}
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[10, 20, 10]} intensity={0.9} />
        <GoldenOcean />
        {/* a few floating hex tiles for atmosphere */}
        <mesh position={[-8, 0.3, 4]} rotation={[0, Math.PI / 6, 0]}>
          <cylinderGeometry args={[2.4, 2.4, 0.6, 6]} />
          <meshStandardMaterial color="#4d7c0f" flatShading />
        </mesh>
        <mesh position={[7, 0.4, -3]} rotation={[0, Math.PI / 6, 0]}>
          <cylinderGeometry args={[2.2, 2.2, 0.8, 6]} />
          <meshStandardMaterial color="#92400e" flatShading />
        </mesh>
        <mesh position={[3, 0.2, 9]} rotation={[0, Math.PI / 6, 0]}>
          <cylinderGeometry args={[2, 2, 0.5, 6]} />
          <meshStandardMaterial color="#d9b772" flatShading />
        </mesh>
      </Canvas>
    </div>
  );
}
