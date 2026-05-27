/**
 * M_V11.PROCMESH.HARNESS — tier-1 primitive visual baselines.
 *
 * One screenshot per primitive on a neutral hex baseplate at a fixed
 * camera. Catches material drift, geometry args drift, and rotation/
 * positioning regressions in the substrate layer.
 *
 * Locks the surface area of `src/world/procedural/primitives/*`.
 */
import { Canvas } from '@react-three/fiber';
import { page } from '@vitest/browser/context';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-react';
import {
  ArrowSlit,
  Banner,
  Battlement,
  Buttress,
  Chimney,
  Column,
  ConeRoof,
  DEFAULT_MATERIALS,
  Door,
  Finial,
  Flag,
  Furrow,
  GoldTrim,
  HayStack,
  Ivy,
  Lantern,
  Log,
  PitchedRoof,
  Shield,
  Silo,
  Spire,
  StoneBrick,
  StonePlinth,
  Tree,
  WeaponRack,
  Window,
  WoodPost,
} from '@/world/procedural/primitives';

function Stage({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ width: 240, height: 240 }}>
      <Canvas camera={{ position: [1.6, 1.5, 1.6], fov: 36 }} style={{ background: '#0f172a' }}>
        <ambientLight intensity={0.7} />
        <directionalLight position={[3, 5, 3]} intensity={1.4} castShadow />
        <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <circleGeometry args={[0.85, 6]} />
          <meshStandardMaterial color="#1e293b" />
        </mesh>
        {children}
      </Canvas>
    </div>
  );
}

// `page.screenshot({path})` resolves the path relative to the TEST
// FILE'S DIRECTORY, not the repo root — so a leading 'tests/harness/'
// would nest. Match the convention used by the other browser tests
// (faction-chips, diplo-ui, etc).
const baselineDir = '__screenshots__';

async function settle() {
  // r3f initial render + one paint is enough — no GLB loading on the
  // procedural primitive path so we don't need a longer beat.
  await new Promise((r) => setTimeout(r, 250));
}

describe('procmesh primitives — tier-1 visual baselines', () => {
  it('Log', async () => {
    render(
      <Stage>
        <Log length={0.8} radius={0.08} position={[0, 0.1, 0]} />
      </Stage>,
    );
    await settle();
    await expect(
      page.screenshot({ path: `${baselineDir}/procmesh-primitive-log.png` }),
    ).resolves.toBeTruthy();
  });
  it('StonePlinth box', async () => {
    render(
      <Stage>
        <StonePlinth width={0.7} depth={0.7} height={0.12} position={[0, 0.06, 0]} />
      </Stage>,
    );
    await settle();
    await expect(
      page.screenshot({ path: `${baselineDir}/procmesh-primitive-stoneplinth-box.png` }),
    ).resolves.toBeTruthy();
  });
  it('StonePlinth round', async () => {
    render(
      <Stage>
        <StonePlinth shape="round" radius={0.4} height={0.12} position={[0, 0.06, 0]} />
      </Stage>,
    );
    await settle();
    await expect(
      page.screenshot({ path: `${baselineDir}/procmesh-primitive-stoneplinth-round.png` }),
    ).resolves.toBeTruthy();
  });
  it('WoodPost', async () => {
    render(
      <Stage>
        <WoodPost height={0.7} position={[0, 0.35, 0]} />
      </Stage>,
    );
    await settle();
    await expect(
      page.screenshot({ path: `${baselineDir}/procmesh-primitive-woodpost.png` }),
    ).resolves.toBeTruthy();
  });
  it('StoneBrick', async () => {
    render(
      <Stage>
        <StoneBrick position={[0, 0.1, 0]} />
      </Stage>,
    );
    await settle();
    await expect(
      page.screenshot({ path: `${baselineDir}/procmesh-primitive-stonebrick.png` }),
    ).resolves.toBeTruthy();
  });
  it('Banner', async () => {
    render(
      <Stage>
        <Banner position={[0, 0.4, 0]} />
      </Stage>,
    );
    await settle();
    await expect(
      page.screenshot({ path: `${baselineDir}/procmesh-primitive-banner.png` }),
    ).resolves.toBeTruthy();
  });
  it('GoldTrim strip', async () => {
    render(
      <Stage>
        <GoldTrim shape="strip" width={0.6} position={[0, 0.3, 0]} />
      </Stage>,
    );
    await settle();
    await expect(
      page.screenshot({ path: `${baselineDir}/procmesh-primitive-goldtrim-strip.png` }),
    ).resolves.toBeTruthy();
  });
  it('GoldTrim ring', async () => {
    render(
      <Stage>
        <GoldTrim shape="ring" radius={0.35} thickness={0.06} position={[0, 0.3, 0]} />
      </Stage>,
    );
    await settle();
    await expect(
      page.screenshot({ path: `${baselineDir}/procmesh-primitive-goldtrim-ring.png` }),
    ).resolves.toBeTruthy();
  });
  it('Battlement single', async () => {
    render(
      <Stage>
        <Battlement position={[0, 0.1, 0]} />
      </Stage>,
    );
    await settle();
    await expect(
      page.screenshot({ path: `${baselineDir}/procmesh-primitive-battlement.png` }),
    ).resolves.toBeTruthy();
  });
  it('ConeRoof with finial', async () => {
    render(
      <Stage>
        <ConeRoof radius={0.35} height={0.4} position={[0, 0.3, 0]} finial />
      </Stage>,
    );
    await settle();
    await expect(
      page.screenshot({ path: `${baselineDir}/procmesh-primitive-coneroof.png` }),
    ).resolves.toBeTruthy();
  });
  it('PitchedRoof', async () => {
    render(
      <Stage>
        <PitchedRoof width={0.7} length={0.7} ridgeHeight={0.32} position={[0, 0.1, 0]} />
      </Stage>,
    );
    await settle();
    await expect(
      page.screenshot({ path: `${baselineDir}/procmesh-primitive-pitchedroof.png` }),
    ).resolves.toBeTruthy();
  });
  it('Column fluted', async () => {
    render(
      <Stage>
        <Column height={0.9} radius={0.1} position={[0, 0, 0]} fluted fluteCount={8} />
      </Stage>,
    );
    await settle();
    await expect(
      page.screenshot({ path: `${baselineDir}/procmesh-primitive-column.png` }),
    ).resolves.toBeTruthy();
  });
  it('Window', async () => {
    render(
      <Stage>
        <Window position={[0, 0.4, 0]} />
      </Stage>,
    );
    await settle();
    await expect(
      page.screenshot({ path: `${baselineDir}/procmesh-primitive-window.png` }),
    ).resolves.toBeTruthy();
  });
  it('Door', async () => {
    render(
      <Stage>
        <Door position={[0, 0.25, 0]} />
      </Stage>,
    );
    await settle();
    await expect(
      page.screenshot({ path: `${baselineDir}/procmesh-primitive-door.png` }),
    ).resolves.toBeTruthy();
  });
  it('WeaponRack', async () => {
    render(
      <Stage>
        <WeaponRack position={[0, 0, 0]} />
      </Stage>,
    );
    await settle();
    await expect(
      page.screenshot({ path: `${baselineDir}/procmesh-primitive-weaponrack.png` }),
    ).resolves.toBeTruthy();
  });
  it('Chimney', async () => {
    render(
      <Stage>
        <Chimney position={[0, 0.1, 0]} />
      </Stage>,
    );
    await settle();
    await expect(
      page.screenshot({ path: `${baselineDir}/procmesh-primitive-chimney.png` }),
    ).resolves.toBeTruthy();
  });
  it('Spire', async () => {
    render(
      <Stage>
        <Spire height={0.6} radius={0.08} position={[0, 0.1, 0]} />
      </Stage>,
    );
    await settle();
    await expect(
      page.screenshot({ path: `${baselineDir}/procmesh-primitive-spire.png` }),
    ).resolves.toBeTruthy();
  });
  it('Buttress', async () => {
    render(
      <Stage>
        <Buttress height={0.6} position={[0, 0.3, 0]} />
      </Stage>,
    );
    await settle();
    await expect(
      page.screenshot({ path: `${baselineDir}/procmesh-primitive-buttress.png` }),
    ).resolves.toBeTruthy();
  });
  it('Shield round', async () => {
    render(
      <Stage>
        <Shield
          shape="round"
          size={0.3}
          position={[0, 0.35, 0]}
          faceMaterial={DEFAULT_MATERIALS.banner}
        />
      </Stage>,
    );
    await settle();
    await expect(
      page.screenshot({ path: `${baselineDir}/procmesh-primitive-shield-round.png` }),
    ).resolves.toBeTruthy();
  });
  // M_V11.POLISH.PROCMESH.ORNAMENTS — new primitives for unique
  // building silhouettes. Each gets a baseline locked.
  it('Silo', async () => {
    render(
      <Stage>
        <Silo height={0.55} radius={0.16} />
      </Stage>,
    );
    await settle();
    await expect(
      page.screenshot({ path: `${baselineDir}/procmesh-primitive-silo.png` }),
    ).resolves.toBeTruthy();
  });
  it('HayStack', async () => {
    render(
      <Stage>
        <HayStack height={0.32} radius={0.2} />
      </Stage>,
    );
    await settle();
    await expect(
      page.screenshot({ path: `${baselineDir}/procmesh-primitive-haystack.png` }),
    ).resolves.toBeTruthy();
  });
  it('Furrow', async () => {
    render(
      <Stage>
        <Furrow width={0.6} depth={0.4} rows={5} />
      </Stage>,
    );
    await settle();
    await expect(
      page.screenshot({ path: `${baselineDir}/procmesh-primitive-furrow.png` }),
    ).resolves.toBeTruthy();
  });
  it('Finial', async () => {
    render(
      <Stage>
        <Finial height={0.3} position={[0, 0.3, 0]} />
      </Stage>,
    );
    await settle();
    await expect(
      page.screenshot({ path: `${baselineDir}/procmesh-primitive-finial.png` }),
    ).resolves.toBeTruthy();
  });
  it('Flag', async () => {
    render(
      <Stage>
        <Flag poleHeight={0.4} pennantLength={0.2} pennantHeight={0.12} />
      </Stage>,
    );
    await settle();
    await expect(
      page.screenshot({ path: `${baselineDir}/procmesh-primitive-flag.png` }),
    ).resolves.toBeTruthy();
  });
  it('Lantern', async () => {
    render(
      <Stage>
        <Lantern size={0.08} bracketLength={0.12} position={[0.1, 0.5, 0]} />
      </Stage>,
    );
    await settle();
    await expect(
      page.screenshot({ path: `${baselineDir}/procmesh-primitive-lantern.png` }),
    ).resolves.toBeTruthy();
  });
  it('ArrowSlit', async () => {
    render(
      <Stage>
        <ArrowSlit height={0.3} width={0.06} position={[0, 0.5, 0]} />
      </Stage>,
    );
    await settle();
    await expect(
      page.screenshot({ path: `${baselineDir}/procmesh-primitive-arrowslit.png` }),
    ).resolves.toBeTruthy();
  });
  it('Ivy', async () => {
    render(
      <Stage>
        <Ivy height={0.5} position={[0, 0, 0]} />
      </Stage>,
    );
    await settle();
    await expect(
      page.screenshot({ path: `${baselineDir}/procmesh-primitive-ivy.png` }),
    ).resolves.toBeTruthy();
  });
  it('Tree', async () => {
    render(
      <Stage>
        <Tree height={0.6} />
      </Stage>,
    );
    await settle();
    await expect(
      page.screenshot({ path: `${baselineDir}/procmesh-primitive-tree.png` }),
    ).resolves.toBeTruthy();
  });
});
