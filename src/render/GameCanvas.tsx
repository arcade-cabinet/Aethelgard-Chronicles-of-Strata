import { Canvas, useThree } from '@react-three/fiber';
import { Suspense, useEffect, useMemo, useRef } from 'react';
import { type Camera, PCFSoftShadowMap } from 'three';
import type { GameState } from '@/game/game-state';
import { CombatText } from '@/world/CombatText';
import { Crossings } from '@/world/Crossings';
import { Decoration } from '@/world/Decoration';
import { EnemyBase } from '@/world/EnemyBase';
import { FootstepEmitter } from '@/world/FootstepEmitter';
import { HomeBase } from '@/world/HomeBase';
import { Mountains } from '@/world/Mountains';
import { ProjectileLayer } from '@/world/ProjectileLayer';
import { RainParticles } from '@/world/RainParticles';
import { RallyMarker } from '@/world/RallyMarker';
import { ResourceNodes } from '@/world/ResourceNodes';
import { ResourceText } from '@/world/ResourceText';
import { Roads } from '@/world/Roads';
import { BuildCompleteFX } from '@/world/BuildCompleteFX';
import { SelectionRing } from '@/world/SelectionRing';
import { Terrain } from '@/world/Terrain';
import { type BuildContext, TileInteraction } from '@/world/TileInteraction';
import { TrackingRings, type TrackingRingsHandle } from '@/world/TrackingRings';
import { Units } from '@/world/Units';
import { Water } from '@/world/Water';
import { ZoneBorder } from '@/world/ZoneBorder';
import { CameraRig } from './CameraRig';
import { DayNightCycle } from './DayNightCycle';
import { useGameLoop } from './useGameLoop';
import { useViewport, type ViewportProfile } from './useViewport';

/** Expose the active r3f camera to the parent via a callback. */
function CameraTap({ onReady }: { onReady: (cam: Camera) => void }) {
  const cam = useThree((s) => s.camera);
  useEffect(() => {
    onReady(cam);
  }, [cam, onReady]);
  return null;
}

/** Inner scene — runs inside the Canvas so r3f hooks are valid. */
function Scene({
  game,
  buildContext,
  viewport,
  onCameraReady,
}: {
  game: GameState;
  buildContext: BuildContext | null;
  viewport: ViewportProfile;
  onCameraReady?: (cam: Camera) => void;
}) {
  useGameLoop(game);
  const ringsRef = useRef<TrackingRingsHandle | null>(null);

  // Build a set of hex tile keys that already have a resource node so the
  // Decoration component can skip those tiles. Memoised on the resource node
  // list (which is stable for the session lifetime).
  const occupiedKeys = useMemo<ReadonlySet<string>>(
    () => new Set(game.resourceNodes.map((n) => n.key)),
    [game.resourceNodes],
  );

  return (
    <>
      <DayNightCycle game={game} />
      <Terrain board={game.board} />
      <Mountains board={game.board} />
      <Crossings board={game.board} />
      <Water mapRadius={game.board.radius} />
      <TileInteraction
        game={game}
        buildContext={buildContext}
        spawnTrackingRing={(q, r) => ringsRef.current?.spawn(q, r)}
      />
      <TrackingRings ref={ringsRef} board={game.board} />
      <Suspense fallback={null}>
        <Decoration board={game.board} occupiedKeys={occupiedKeys} />
        <ResourceNodes game={game} />
        <Roads game={game} />
        <BuildCompleteFX game={game} />
        <HomeBase game={game} />
        <EnemyBase game={game} />
        <Units game={game} />
      </Suspense>
      <CombatText game={game} />
      <ResourceText game={game} />
      <ProjectileLayer game={game} />
      <FootstepEmitter game={game} />
      <RainParticles game={game} />
      <RallyMarker game={game} />
      <SelectionRing game={game} />
      <ZoneBorder game={game} />
      <CameraRig viewport={viewport} boardRadius={game.board.radius} />
      {onCameraReady && <CameraTap onReady={onCameraReady} />}
    </>
  );
}

/** Props for the game canvas. */
export interface GameCanvasProps {
  /** The live game state to render. */
  game: GameState;
  /** The active build context (a building chosen to place), or null. */
  buildContext?: BuildContext | null;
  /** Receives the r3f camera reference (for HUD overlays that project to screen). */
  onCameraReady?: (cam: Camera) => void;
}

/**
 * The react-three-fiber canvas hosting the board scene. The viewport profile
 * (desktop / phone-landscape / phone-portrait) is resolved here and drives the
 * `CameraRig`'s default framing. Soft (PCF) shadows give the gentle low-poly
 * look; `DayNightCycle` adds distance fog and drives the lighting.
 */
export function GameCanvas({ game, buildContext = null, onCameraReady }: GameCanvasProps) {
  const viewport = useViewport();
  return (
    <Canvas
      shadows={{ type: PCFSoftShadowMap }}
      camera={{ position: [0, 55, 62], fov: viewport.camera.fov }}
      style={{ position: 'absolute', inset: 0 }}
    >
      <Scene
        game={game}
        buildContext={buildContext}
        viewport={viewport}
        {...(onCameraReady ? { onCameraReady } : {})}
      />
    </Canvas>
  );
}
