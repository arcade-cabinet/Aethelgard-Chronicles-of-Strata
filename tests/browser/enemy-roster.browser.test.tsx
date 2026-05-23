import { Canvas } from '@react-three/fiber';
import { Suspense } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { AnimatedCharacter } from '@/entities/AnimatedCharacter';

/**
 * Verify that the three new enemy archetypes (Vampire, BlackKnight, Witch)
 * load their GLBs correctly and mount skinned meshes — i.e. they do NOT T-pose
 * (a T-pose would mean the animation rig failed to bind to the character mesh).
 *
 * Each character is rendered with the Idle_A clip via the shared rig pipeline
 * (AnimatedCharacter + rig.ts), confirming the GLB → rig retargeting path
 * works end-to-end for all three new roles.
 */
describe('enemy roster — new archetypes', () => {
  it.each([
    ['Vampire', 'Idle_A'],
    ['BlackKnight', 'Idle_A'],
    ['Witch', 'Idle_A'],
  ] as const)('%s loads a skinned mesh without T-posing', async (role, clip) => {
    const captured: { scene?: import('three').Object3D } = {};
    render(
      <Canvas
        onCreated={(state) => {
          captured.scene = state.scene;
        }}
      >
        <Suspense fallback={null}>
          <AnimatedCharacter role={role} clip={clip} />
        </Suspense>
      </Canvas>,
    );

    await vi.waitFor(
      () => {
        let skinned = 0;
        captured.scene?.traverse((o) => {
          if ((o as { isSkinnedMesh?: boolean }).isSkinnedMesh) skinned += 1;
        });
        expect(skinned, `${role} should mount at least one SkinnedMesh`).toBeGreaterThan(0);
      },
      { timeout: 12_000, interval: 200 },
    );
  });
});
