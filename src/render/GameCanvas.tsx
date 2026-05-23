import { Canvas, useThree } from '@react-three/fiber';
import { Suspense, useEffect, useMemo, useRef } from 'react';
import { type Camera, PCFSoftShadowMap } from 'three';
import type { GameState } from '@/game/game-state';
import { CombatText } from '@/world/CombatText';
import { Crossings } from '@/world/Crossings';
import { Decoration } from '@/world/Decoration';
import { FactionBase } from '@/world/FactionBase';
import { FootstepEmitter } from '@/world/FootstepEmitter';
import { Mountains } from '@/world/Mountains';
import { ProjectileLayer } from '@/world/ProjectileLayer';
import { RainParticles } from '@/world/RainParticles';
import { RallyMarker } from '@/world/RallyMarker';
import { ResourceNodes } from '@/world/ResourceNodes';
import { ResourceText } from '@/world/ResourceText';
import { Roads } from '@/world/Roads';
import { BuildCompleteFX } from '@/world/BuildCompleteFX';
import { SawdustFX } from '@/world/SawdustFX';
import { VictoryConfetti } from '@/world/VictoryConfetti';
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
import { Building, HexPosition } from '@/ecs/components';
import { useState } from 'react';
import { useFrame } from '@react-three/fiber';

/**
 * Decoration wrapper that snapshots game.buildSites per frame into the
 * shape Decoration's M_MAPGEN.13 building-accretion expects. Keeps the
 * snapshot diff-equal across frames so React's memo doesn't re-fire on
 * no-op updates.
 */
function DecorationLive({
  game,
  occupiedKeys,
}: {
  game: GameState;
  occupiedKeys: ReadonlySet<string>;
}) {
  const [sites, setSites] = useState<
    Array<{ key: string; q: number; r: number; level: number; type: string; isComplete: boolean }>
  >([]);
  useFrame(() => {
    const next: typeof sites = [];
    for (const [key, entity] of game.buildSites) {
      const b = entity.get(Building);
      const h = entity.get(HexPosition);
      if (!b || !h) continue;
      next.push({
        key,
        q: h.q,
        r: h.r,
        level: h.level,
        type: b.buildingType,
        isComplete: b.isComplete,
      });
    }
    setSites((prev) => {
      if (
        next.length === prev.length &&
        next.every((s, i) => s.key === prev[i]?.key && s.isComplete === prev[i]?.isComplete)
      ) {
        return prev;
      }
      return next;
    });
  });
  return (
    <Decoration
      board={game.board}
      occupiedKeys={occupiedKeys}
      enemyBaseKey={game.enemyBaseKey}
      playerBaseKey={game.townHallKey}
      buildSites={sites}
    />
  );
}

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
        <DecorationLive game={game} occupiedKeys={occupiedKeys} />
        <ResourceNodes game={game} />
        <Roads game={game} />
        <BuildCompleteFX game={game} />
        <SawdustFX game={game} />
        <VictoryConfetti game={game} />
        {/* M_REGISTRY.4 — ONE faction-symmetric base renderer mounted */}
        {/* twice with different `faction` props. Visual divergence is */}
        {/* 100% data (SKINS[faction] in src/rules/skins.ts), 0% code.  */}
        <FactionBase game={game} faction="player" />
        <FactionBase game={game} faction="enemy" />
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
