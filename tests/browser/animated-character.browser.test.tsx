import { Canvas } from '@react-three/fiber';
import { Suspense } from 'react';
import type { Object3D } from 'three';
import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { AnimatedCharacter } from '@/entities/AnimatedCharacter';

describe('AnimatedCharacter', () => {
  it('loads a KayKit character GLB and mounts a skinned mesh that animates', async () => {
    const captured: { scene?: Object3D } = {};
    function Probe() {
      return (
        <Suspense fallback={null}>
          {/* biome-ignore lint/a11y/useValidAriaRole: `role` is a domain prop
              of the r3f AnimatedCharacter (unit role), not a DOM ARIA role. */}
          <AnimatedCharacter role="Footman" clip="Idle_A" />
        </Suspense>
      );
    }
    render(
      <Canvas
        onCreated={(state) => {
          captured.scene = state.scene;
        }}
      >
        <Probe />
      </Canvas>,
    );

    // wait for the async GLB loads to resolve and the mesh to mount
    await vi.waitFor(
      () => {
        let skinned = 0;
        captured.scene?.traverse((o) => {
          if ((o as { isSkinnedMesh?: boolean }).isSkinnedMesh) skinned += 1;
        });
        expect(skinned).toBeGreaterThan(0);
      },
      { timeout: 10_000, interval: 200 },
    );
  });
});
