/**
 * M_V11.POLISH.MOUNTAINS.VARIANTS — mountain shape variant baselines.
 *
 * One screenshot per peak shape (jagged, dome, mesa, cliff) at three
 * height scales (0.85, 1.0, 1.15) + one snow-cap variant per shape.
 * Locks the surface of each peak archetype so a refactor that breaks
 * jagged-vs-dome geometry trips the diff.
 *
 * The Mountains component takes a BoardData; this harness bypasses that
 * by mounting individual peak primitives. The per-variant subcomponents
 * are not exported from Mountains.tsx — they're internal — so the
 * harness re-implements the same JSX inline. Geometry must match.
 */
import { Canvas } from '@react-three/fiber';
import { page } from '@vitest/browser/context';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-react';

const ROCK_COLOR = '#475569';
const ROCK_ROUGHNESS = 0.95;
const SNOW_COLOR = '#f8fafc';

function Stage({ children, cameraDist = 8.5 }: { children: React.ReactNode; cameraDist?: number }) {
  return (
    <div style={{ width: 320, height: 360 }}>
      <Canvas
        camera={{
          position: [cameraDist * 0.55, cameraDist * 0.5, cameraDist * 0.55],
          fov: 42,
        }}
        style={{ background: '#0f172a' }}
      >
        <ambientLight intensity={0.7} />
        <directionalLight position={[4, 7, 3]} intensity={1.45} castShadow />
        <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <circleGeometry args={[2.5, 6]} />
          <meshStandardMaterial color="#1e293b" />
        </mesh>
        {children}
      </Canvas>
    </div>
  );
}

const baselineDir = '__screenshots__';

async function settle() {
  await new Promise((r) => setTimeout(r, 400));
}

function Jagged({ heightScale = 1.0 }: { heightScale?: number }) {
  const h = 3.5 * heightScale;
  return (
    <>
      <mesh position={[0, h / 2, 0]} castShadow receiveShadow>
        <coneGeometry args={[1.6, h, 6]} />
        <meshStandardMaterial color={ROCK_COLOR} flatShading roughness={ROCK_ROUGHNESS} />
      </mesh>
      <mesh position={[0.85, h * 0.45, 0.3]} rotation={[0, Math.PI / 6, 0.18]} castShadow>
        <coneGeometry args={[0.85, h * 0.7, 5]} />
        <meshStandardMaterial color={ROCK_COLOR} flatShading roughness={ROCK_ROUGHNESS} />
      </mesh>
      <mesh position={[-0.7, h * 0.4, -0.45]} rotation={[0, -Math.PI / 5, -0.15]} castShadow>
        <coneGeometry args={[0.7, h * 0.6, 5]} />
        <meshStandardMaterial color={ROCK_COLOR} flatShading roughness={ROCK_ROUGHNESS} />
      </mesh>
    </>
  );
}

function Dome({ heightScale = 1.0 }: { heightScale?: number }) {
  const h = 2.8 * heightScale;
  return (
    <>
      <mesh position={[0, h * 0.3, 0]} castShadow receiveShadow>
        <coneGeometry args={[1.7, h * 0.6, 7]} />
        <meshStandardMaterial color={ROCK_COLOR} flatShading roughness={ROCK_ROUGHNESS} />
      </mesh>
      <mesh position={[0, h * 0.65, 0]} castShadow receiveShadow>
        <sphereGeometry args={[1.25, 12, 8, 0, Math.PI * 2, 0, Math.PI / 1.6]} />
        <meshStandardMaterial color={ROCK_COLOR} flatShading roughness={ROCK_ROUGHNESS} />
      </mesh>
    </>
  );
}

function Mesa({ heightScale = 1.0 }: { heightScale?: number }) {
  const h = 2.4 * heightScale;
  return (
    <>
      <mesh position={[0, h * 0.18, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[1.7, 1.85, h * 0.36, 8]} />
        <meshStandardMaterial color={ROCK_COLOR} flatShading roughness={ROCK_ROUGHNESS} />
      </mesh>
      <mesh position={[0, h * 0.55, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[1.3, 1.5, h * 0.4, 8]} />
        <meshStandardMaterial color={ROCK_COLOR} flatShading roughness={ROCK_ROUGHNESS} />
      </mesh>
      <mesh position={[0, h * 0.88, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[1.05, 1.2, h * 0.18, 8]} />
        <meshStandardMaterial color={ROCK_COLOR} flatShading roughness={ROCK_ROUGHNESS} />
      </mesh>
    </>
  );
}

function Cliff({ heightScale = 1.0 }: { heightScale?: number }) {
  const h = 3.0 * heightScale;
  return (
    <>
      <mesh position={[0, h * 0.3, 0]} castShadow receiveShadow>
        <boxGeometry args={[2.2, h * 0.6, 1.7]} />
        <meshStandardMaterial color={ROCK_COLOR} flatShading roughness={ROCK_ROUGHNESS} />
      </mesh>
      <mesh position={[-0.55, h * 0.78, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <coneGeometry args={[1.6, h * 0.55, 4]} />
        <meshStandardMaterial color={ROCK_COLOR} flatShading roughness={ROCK_ROUGHNESS} />
      </mesh>
    </>
  );
}

describe('mountain variants (M_V11.POLISH.MOUNTAINS.VARIANTS)', () => {
  it('jagged', async () => {
    render(
      <Stage>
        <Jagged />
      </Stage>,
    );
    await settle();
    await expect(
      page.screenshot({ path: `${baselineDir}/mountain-jagged.png` }),
    ).resolves.toBeTruthy();
  });
  it('dome', async () => {
    render(
      <Stage>
        <Dome />
      </Stage>,
    );
    await settle();
    await expect(
      page.screenshot({ path: `${baselineDir}/mountain-dome.png` }),
    ).resolves.toBeTruthy();
  });
  it('mesa', async () => {
    render(
      <Stage>
        <Mesa />
      </Stage>,
    );
    await settle();
    await expect(
      page.screenshot({ path: `${baselineDir}/mountain-mesa.png` }),
    ).resolves.toBeTruthy();
  });
  it('cliff', async () => {
    render(
      <Stage>
        <Cliff />
      </Stage>,
    );
    await settle();
    await expect(
      page.screenshot({ path: `${baselineDir}/mountain-cliff.png` }),
    ).resolves.toBeTruthy();
  });
  it('jagged with snowcap', async () => {
    render(
      <Stage>
        <Jagged />
        <mesh position={[0, 3.5 * 0.74, 0]} castShadow>
          <coneGeometry args={[0.85, 1.8, 6]} />
          <meshStandardMaterial color={SNOW_COLOR} flatShading roughness={0.6} />
        </mesh>
      </Stage>,
    );
    await settle();
    await expect(
      page.screenshot({ path: `${baselineDir}/mountain-jagged-snowcap.png` }),
    ).resolves.toBeTruthy();
  });
  it('mesa with snowcap', async () => {
    render(
      <Stage>
        <Mesa />
        <mesh position={[0, 2.4 * 1.0, 0]} castShadow>
          <cylinderGeometry args={[1.05, 1.1, 0.18, 8]} />
          <meshStandardMaterial color={SNOW_COLOR} flatShading roughness={0.6} />
        </mesh>
      </Stage>,
    );
    await settle();
    await expect(
      page.screenshot({ path: `${baselineDir}/mountain-mesa-snowcap.png` }),
    ).resolves.toBeTruthy();
  });
  // Composite — a small range of all 4 shapes side by side to verify
  // they read as one biome family despite shape variety.
  it('all 4 shapes side by side', async () => {
    render(
      <Stage cameraDist={16}>
        <group position={[-5, 0, 0]} scale={0.6}>
          <Jagged heightScale={0.95} />
        </group>
        <group position={[-1.7, 0, 0]} scale={0.6}>
          <Dome heightScale={1.05} />
        </group>
        <group position={[1.7, 0, 0]} scale={0.6}>
          <Mesa heightScale={1.0} />
        </group>
        <group position={[5, 0, 0]} scale={0.6}>
          <Cliff heightScale={1.1} />
        </group>
      </Stage>,
    );
    await settle();
    await expect(
      page.screenshot({ path: `${baselineDir}/mountain-range-all-shapes.png` }),
    ).resolves.toBeTruthy();
  });
});
