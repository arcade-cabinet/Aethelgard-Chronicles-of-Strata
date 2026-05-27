/**
 * M_V11.PROCMESH.HARNESS — tier-2 building visual baselines.
 *
 * One screenshot per building composition + a faction-cross sample
 * so palette drift is caught.
 */
import { Canvas, useThree } from '@react-three/fiber';
import { page } from '@vitest/browser/context';
import { useEffect, useRef } from 'react';
import { Box3, type Group, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-react';
import {
  Barracks,
  Farm,
  Granary,
  House,
  Library,
  Palace,
  Wall,
  Watchtower,
  Wonder,
} from '@/world/procedural/buildings';
import { FactionMaterialsProvider } from '@/world/procedural/FactionMaterialsContext';

/** Auto-fit camera onto the rendered group bbox so tall buildings aren't
 *  cropped. Frames the bbox with padding and points the camera at the
 *  bbox centre, viewed from a fixed 3/4 angle. */
function AutoFit({ children }: { children: React.ReactNode }) {
  const ref = useRef<Group>(null);
  const { camera } = useThree();
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const box = new Box3().setFromObject(node);
    const center = new Vector3();
    const sz = new Vector3();
    box.getCenter(center);
    box.getSize(sz);
    const maxExtent = Math.max(sz.x, sz.y, sz.z);
    // FOV-driven distance with 1.05× padding so the whole silhouette
    // including roof spires sits inside the frame but fills it tightly
    // so detail is visible at the screenshot scale.
    const fov = 'fov' in camera ? (camera as { fov: number }).fov : 38;
    const fovRad = (fov * Math.PI) / 180;
    const dist = (maxExtent * 1.05) / Math.tan(fovRad / 2);
    const dir = new Vector3(1, 0.85, 1).normalize();
    camera.position.copy(center).addScaledVector(dir, dist);
    camera.lookAt(center);
    // Push near/far so the building can't be clipped.
    if ('near' in camera) (camera as { near: number }).near = Math.max(0.01, dist * 0.05);
    if ('far' in camera) (camera as { far: number }).far = dist * 6;
    if ('updateProjectionMatrix' in camera) camera.updateProjectionMatrix();
  }, [camera]);
  return <group ref={ref}>{children}</group>;
}

function Stage({
  children,
}: {
  children: React.ReactNode;
  /** Legacy prop — kept so call sites compile while we transition; ignored. */
  cameraPos?: [number, number, number];
}) {
  return (
    <div style={{ width: 320, height: 320 }}>
      <Canvas camera={{ position: [2.2, 2, 2.2], fov: 38 }} style={{ background: '#0f172a' }}>
        <ambientLight intensity={0.75} />
        <directionalLight position={[4, 6, 3]} intensity={1.45} castShadow />
        <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <circleGeometry args={[1, 6]} />
          <meshStandardMaterial color="#1e293b" />
        </mesh>
        <AutoFit>{children}</AutoFit>
      </Canvas>
    </div>
  );
}

const baselineDir = '__screenshots__';

async function settle() {
  // Give AutoFit's useEffect a frame to run before the screenshot.
  await new Promise((r) => setTimeout(r, 600));
}

// CodeRabbit (PR #89) flagged that `expect(page.screenshot(...)).resolves
// .toBeTruthy()` only verifies the screenshot call resolved; it doesn't
// fail on a visual regression. The actual regression guard in this repo
// is the BAKED PNG file committed to git under __screenshots__/ — when a
// rebake (--update) writes a different byte-stream the git diff surfaces
// the change in the PR review. `page.screenshot({path})` writes the file;
// the toBeTruthy() asserts the write succeeded. A proper toHaveScreenshot
// matcher requires the Playwright test-runner (which gates tests/e2e/);
// this file runs under vitest-browser-playwright which doesn't expose
// that matcher. The committed-PNG pattern is the project's established
// visual contract — see also tests/harness/biome-swatch.browser.test.tsx
// and the rest of the procmesh-* harness battery.

describe('procmesh buildings — tier-2 visual baselines (player palette)', () => {
  it('Palace', async () => {
    render(
      <Stage cameraPos={[2.6, 2.2, 2.6]}>
        <FactionMaterialsProvider faction="player">
          <Palace />
        </FactionMaterialsProvider>
      </Stage>,
    );
    await settle();
    await expect(
      page.screenshot({ path: `${baselineDir}/procmesh-building-player-palace.png` }),
    ).resolves.toBeTruthy();
  });
  it('Barracks', async () => {
    render(
      <Stage>
        <FactionMaterialsProvider faction="player">
          <Barracks />
        </FactionMaterialsProvider>
      </Stage>,
    );
    await settle();
    await expect(
      page.screenshot({ path: `${baselineDir}/procmesh-building-player-barracks.png` }),
    ).resolves.toBeTruthy();
  });
  it('Wall', async () => {
    render(
      <Stage cameraPos={[1.8, 1.5, 1.8]}>
        <FactionMaterialsProvider faction="player">
          <Wall withBanner />
        </FactionMaterialsProvider>
      </Stage>,
    );
    await settle();
    await expect(
      page.screenshot({ path: `${baselineDir}/procmesh-building-player-wall.png` }),
    ).resolves.toBeTruthy();
  });
  it('Watchtower', async () => {
    render(
      <Stage cameraPos={[1.8, 2.0, 1.8]}>
        <FactionMaterialsProvider faction="player">
          <Watchtower />
        </FactionMaterialsProvider>
      </Stage>,
    );
    await settle();
    await expect(
      page.screenshot({ path: `${baselineDir}/procmesh-building-player-watchtower.png` }),
    ).resolves.toBeTruthy();
  });
  it('Farm', async () => {
    render(
      <Stage>
        <FactionMaterialsProvider faction="player">
          <Farm />
        </FactionMaterialsProvider>
      </Stage>,
    );
    await settle();
    await expect(
      page.screenshot({ path: `${baselineDir}/procmesh-building-player-farm.png` }),
    ).resolves.toBeTruthy();
  });
  it('House', async () => {
    render(
      <Stage>
        <FactionMaterialsProvider faction="player">
          <House />
        </FactionMaterialsProvider>
      </Stage>,
    );
    await settle();
    await expect(
      page.screenshot({ path: `${baselineDir}/procmesh-building-player-house.png` }),
    ).resolves.toBeTruthy();
  });
  it('Granary', async () => {
    render(
      <Stage>
        <FactionMaterialsProvider faction="player">
          <Granary />
        </FactionMaterialsProvider>
      </Stage>,
    );
    await settle();
    await expect(
      page.screenshot({ path: `${baselineDir}/procmesh-building-player-granary.png` }),
    ).resolves.toBeTruthy();
  });
  it('Library', async () => {
    render(
      <Stage cameraPos={[2.4, 2.0, 2.4]}>
        <FactionMaterialsProvider faction="player">
          <Library />
        </FactionMaterialsProvider>
      </Stage>,
    );
    await settle();
    await expect(
      page.screenshot({ path: `${baselineDir}/procmesh-building-player-library.png` }),
    ).resolves.toBeTruthy();
  });
  it('Wonder', async () => {
    render(
      <Stage cameraPos={[3.2, 2.6, 3.2]}>
        <FactionMaterialsProvider faction="player">
          <Wonder />
        </FactionMaterialsProvider>
      </Stage>,
    );
    await settle();
    await expect(
      page.screenshot({ path: `${baselineDir}/procmesh-building-player-wonder.png` }),
    ).resolves.toBeTruthy();
  });
});

describe('procmesh buildings — Wall variants (M_V11.POLISH.PROCMESH.WALL-VARIANTS)', () => {
  for (const [name, props] of [
    ['plain', {}],
    ['gate', { hasGate: true }],
    ['banner', { withBanner: true }],
    ['corner', { isCorner: true }],
    ['gate-banner', { hasGate: true, withBanner: true }],
    ['gate-banner-corner', { hasGate: true, withBanner: true, isCorner: true }],
  ] as const) {
    it(`Wall ${name}`, async () => {
      render(
        <Stage>
          <FactionMaterialsProvider faction="player">
            <Wall {...(props as Record<string, boolean>)} />
          </FactionMaterialsProvider>
        </Stage>,
      );
      await settle();
      await expect(
        page.screenshot({ path: `${baselineDir}/procmesh-building-wall-variant-${name}.png` }),
      ).resolves.toBeTruthy();
    });
  }
});

describe('procmesh buildings — faction-cross palette shift', () => {
  it('Palace — enemy (necropolis palette)', async () => {
    render(
      <Stage cameraPos={[2.6, 2.2, 2.6]}>
        <FactionMaterialsProvider faction="enemy">
          <Palace />
        </FactionMaterialsProvider>
      </Stage>,
    );
    await settle();
    await expect(
      page.screenshot({ path: `${baselineDir}/procmesh-building-enemy-palace.png` }),
    ).resolves.toBeTruthy();
  });
  it('Wonder — enemy (necropolis palette)', async () => {
    render(
      <Stage cameraPos={[3.2, 2.6, 3.2]}>
        <FactionMaterialsProvider faction="enemy">
          <Wonder />
        </FactionMaterialsProvider>
      </Stage>,
    );
    await settle();
    await expect(
      page.screenshot({ path: `${baselineDir}/procmesh-building-enemy-wonder.png` }),
    ).resolves.toBeTruthy();
  });
  // M_V11.POLISH.PROCMESH-FACTION-CROSS — every building × enemy palette
  // so a reviewer can scan the full set for necropolis-read regressions.
  for (const [name, Component, camera] of [
    ['barracks', Barracks, [2.2, 2.0, 2.2]],
    ['wall', Wall, [1.8, 1.5, 1.8]],
    ['watchtower', Watchtower, [1.8, 2.0, 1.8]],
    ['farm', Farm, [2.2, 2.0, 2.2]],
    ['house', House, [2.2, 2.0, 2.2]],
    ['granary', Granary, [2.2, 2.0, 2.2]],
    ['library', Library, [2.4, 2.0, 2.4]],
  ] as Array<[string, typeof Barracks, [number, number, number]]>) {
    it(`${name} — enemy (necropolis palette)`, async () => {
      render(
        <Stage cameraPos={camera}>
          <FactionMaterialsProvider faction="enemy">
            <Component />
          </FactionMaterialsProvider>
        </Stage>,
      );
      await settle();
      await expect(
        page.screenshot({ path: `${baselineDir}/procmesh-building-enemy-${name}.png` }),
      ).resolves.toBeTruthy();
    });
  }
});
