import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import {
  CanvasTexture,
  Color,
  type DirectionalLight,
  FogExp2,
  RepeatWrapping,
} from 'three';
import { cyclePhase, lightIntensityAt, skyRgbAt } from '@/game/clock';
import type { GameState } from '@/game/game-state';

/** Exponential-fog density — a soft distance haze, matching poc1. */
const FOG_DENSITY = 0.01;

/**
 * M_AUDIT2.UX.29 — generate a tiny 4×4 blue-noise dither texture
 * once. A back-side sphere multiplies this against the sky base
 * color so the smooth ramp across the dome doesn't band into 8-bit
 * stripes during sunset/sunrise. The pattern is so small the GPU
 * mipmaps it to true noise at horizon distance.
 */
function makeDitherTexture(): CanvasTexture {
  const size = 4;
  const cv = document.createElement('canvas');
  cv.width = size;
  cv.height = size;
  const ctx = cv.getContext('2d');
  if (ctx) {
    // Bayer 4×4 thresholds, normalised so the darkest = -2/255 LSB
    // and the brightest = +2/255 LSB — only ±1 LSB modulation around
    // gray (128), enough to break a band, invisible as 'noise'.
    const bayer = [
      [0, 8, 2, 10],
      [12, 4, 14, 6],
      [3, 11, 1, 9],
      [15, 7, 13, 5],
    ];
    const img = ctx.createImageData(size, size);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const v = 126 + bayer[y]![x]! / 16 * 4; // 126..130
        const i = (y * size + x) * 4;
        img.data[i] = v;
        img.data[i + 1] = v;
        img.data[i + 2] = v;
        img.data[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
  }
  const tex = new CanvasTexture(cv);
  tex.wrapS = RepeatWrapping;
  tex.wrapT = RepeatWrapping;
  tex.repeat.set(80, 80);
  return tex;
}

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
  const fog = useRef(new FogExp2('#bae6fd', FOG_DENSITY));

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
