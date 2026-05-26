import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import { Color, type DirectionalLight, FogExp2 } from 'three';
import { cyclePhase, lightIntensityAt, skyRgbAt } from '@/game/clock';
import type { GameState } from '@/game/game-state';
import { cameraView } from './camera-view';
// M_EXPANSION.D.173 — dither-texture extracted to src/render/textures/.
import { makeDitherTexture } from './textures/dither';

/**
 * M_GAME.BUG.11 — horizon-aware exponential fog. The fog density is
 * tuned so the back of the *currently visible* frustum slice fades
 * into the sky color, regardless of map size or geometry. We modulate
 * the FogExp2 density per-frame against `cameraView.distance` so:
 *
 * - Zoomed in (distance ≈ minZoom): fog is sparse, the local realm
 *   reads crisp.
 * - Zoomed out (distance ≈ maxZoom): fog ramps up so mountain ranges
 *   at the back-third of the view fade into the sky, producing a
 *   readable horizon line without needing per-tile depth tapering.
 *
 * Constants chosen so a hex roughly 1.5× the current camera distance
 * away from the target is ~50% obscured — that's the "back of the
 * panorama" we want gently veiled, never sharp.
 */
const FOG_NEAR_DENSITY = 0.012;
const FOG_FAR_DENSITY = 0.045;

/**
 * Drives the day/night cycle each frame: the scene background and the distance
 * fog follow the sky-color curve, and the directional light intensity follows
 * `lightIntensityAt(phase)`, so the board visibly moves from a bright noon
 * through sunset into a dark, dim night and back. The cosine is evaluated once
 * per frame and the colors are mutated in place — no per-frame allocation.
 */
export function DayNightCycle({ game }: { game: GameState }) {
  const lightRef = useRef<DirectionalLight>(null);
  const scene = useThree((s) => s.scene);
  const skyColor = useRef(new Color('#bae6fd'));
  const fog = useRef(new FogExp2('#bae6fd', FOG_NEAR_DENSITY));

  // attach exponential distance fog once
  useEffect(() => {
    scene.fog = fog.current;
    return () => {
      scene.fog = null;
    };
  }, [scene]);

  // tune the shadow camera for the board-sized scene
  useEffect(() => {
    const light = lightRef.current;
    if (!light) return;
    light.shadow.mapSize.set(2048, 2048);
    light.shadow.camera.left = -60;
    light.shadow.camera.right = 60;
    light.shadow.camera.top = 60;
    light.shadow.camera.bottom = -60;
    light.shadow.bias = -0.0005;
    light.shadow.camera.updateProjectionMatrix();
  }, []);

  useFrame(() => {
    const phase = cyclePhase(game.clock);
    const intensity = lightIntensityAt(phase);
    if (lightRef.current) {
      lightRef.current.intensity = 0.3 + intensity * 1.4;
    }
    const { r, g, b } = skyRgbAt(phase, intensity);
    skyColor.current.setRGB(r / 255, g / 255, b / 255);
    scene.background = skyColor.current;
    fog.current.color.setRGB(r / 255, g / 255, b / 255);
    // Horizon ramp: blend FOG_NEAR↔FOG_FAR density based on the
    // current camera distance from its pan target (published by
    // CameraRig into the cameraView channel). Clamped 0..1 over the
    // 20..95 distance band that matches WORLD.camera.{minZoom,maxZoom}.
    const d = cameraView.distance;
    const t = Math.max(0, Math.min(1, (d - 20) / (95 - 20)));
    fog.current.density = FOG_NEAR_DENSITY + (FOG_FAR_DENSITY - FOG_NEAR_DENSITY) * t;
  });

  // M_AUDIT2.UX.29 — dither overlay sphere (back-side, no depth) that
  // multiplies a ±1-LSB noise into the sky base color so the gradient
  // stops banding in 8-bit during sunset. The base color comes from
  // scene.background (set above each frame); the overlay just adds
  // imperceptible noise on top.
  const ditherTex = useMemo(makeDitherTexture, []);
  return (
    <>
      <hemisphereLight args={['#ffffff', '#444444', 0.6]} />
      <directionalLight ref={lightRef} position={[40, 60, 25]} intensity={1.5} castShadow />
      <mesh renderOrder={-1}>
        <sphereGeometry args={[500, 16, 12]} />
        <meshBasicMaterial
          map={ditherTex}
          side={1 /* BackSide */}
          depthWrite={false}
          transparent
          opacity={0.06}
        />
      </mesh>
    </>
  );
}
