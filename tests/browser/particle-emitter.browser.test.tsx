/**
 * ParticleEmitter (M_REGISTRY.6) — browser-mode rendering coverage.
 *
 * Mounts ParticleEmitter with the rain archetype in a real r3f Canvas
 * and verifies that drops mesh into the scene when weather=rain. The
 * spawn → render flow exercises the full state-machine path
 * (createMapPrng → spec.tick → setState → spec.renderParticle →
 * three.js mesh).
 */
import { Canvas } from '@react-three/fiber';
import { Suspense } from 'react';
import type { Object3D } from 'three';
import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { startGame } from '@/game/game-state';
import { ParticleEmitter } from '@/world/ParticleEmitter';
import { rainArchetype } from '@/world/particle-archetypes';

describe('ParticleEmitter (M_REGISTRY.6) browser rendering', () => {
  it('renders rain drops into the scene when weather=rain', async () => {
    const game = startGame('rain-mount-test');
    game.weather.state = 'rain';
    const captured: { scene?: Object3D } = {};

    render(
      <Canvas
        onCreated={(state) => {
          captured.scene = state.scene;
        }}
      >
        <Suspense fallback={null}>
          <ParticleEmitter game={game} spec={rainArchetype} />
        </Suspense>
      </Canvas>,
    );

    // Wait for ParticleEmitter's first useFrame to spawn drops + render
    // their meshes. The rain archetype tops up to 1200 drops on first
    // tick; the scene should contain many meshes named 'rain'.
    await vi.waitFor(
      () => {
        let foundRainGroup = false;
        let meshCount = 0;
        captured.scene?.traverse((o) => {
          if (o.name === 'rain') foundRainGroup = true;
          if ((o as { isMesh?: boolean }).isMesh) meshCount += 1;
        });
        expect(foundRainGroup).toBe(true);
        // At minimum a handful of drop meshes should appear within
        // the first few frames; the actual 1200 may take more frames.
        expect(meshCount).toBeGreaterThan(10);
      },
      { timeout: 8_000, interval: 100 },
    );
  });

  it('returns null group when weather is not rain', async () => {
    const game = startGame('rain-mount-skip');
    game.weather.state = 'sunny';
    const captured: { scene?: Object3D } = {};

    render(
      <Canvas
        onCreated={(state) => {
          captured.scene = state.scene;
        }}
      >
        <Suspense fallback={null}>
          <ParticleEmitter game={game} spec={rainArchetype} />
        </Suspense>
      </Canvas>,
    );

    // Give the emitter a few frames; with weather=sunny no rain group
    // should be added to the scene.
    await new Promise((resolve) => setTimeout(resolve, 500));
    let foundRainGroup = false;
    captured.scene?.traverse((o) => {
      if (o.name === 'rain') foundRainGroup = true;
    });
    expect(foundRainGroup).toBe(false);
  });
});
