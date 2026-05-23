import { Canvas, useThree } from '@react-three/fiber';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { type Camera, PCFSoftShadowMap } from 'three';
import type { GameState } from '@/game/game-state';
import { CombatText } from '@/world/CombatText';
import { Crossings } from '@/world/Crossings';
import { Decoration } from '@/world/Decoration';
import { FactionBase } from '@/world/FactionBase';
import { FootstepEmitter } from '@/world/FootstepEmitter';
import { Mountains } from '@/world/Mountains';
import { ParticleEmitter } from '@/world/ParticleEmitter';
import {
  buildCompleteArchetype,
  rainArchetype,
  sawdustArchetype,
  victoryConfettiArchetype,
} from '@/world/particle-archetypes';
import { ProjectileLayer } from '@/world/ProjectileLayer';
import { RallyMarker } from '@/world/RallyMarker';
import { ResourceNodes } from '@/world/ResourceNodes';
import { ResourceText } from '@/world/ResourceText';
import { Roads } from '@/world/Roads';
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
import { Building, type BuildingType, HexPosition } from '@/ecs/components';
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
    Array<{
      key: string;
      q: number;
      r: number;
      level: number;
      type: BuildingType;
      isComplete: boolean;
    }>
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
        next.every(
          (s, i) =>
            // M_MICRO.5.4 — also compare level + type so a Wall→Gate
            // composition swap (same key, same isComplete) triggers a
            // re-render of the Decoration mask. Without these, the
            // gate would render visually but pathing/decoration would
            // miss the swap for one frame.
            s.key === prev[i]?.key &&
            s.isComplete === prev[i]?.isComplete &&
            s.level === prev[i]?.level &&
            s.type === prev[i]?.type,
        )
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
        {/* M_REGISTRY.6 — 4 sibling particle FX → ParticleEmitter +
            archetype specs. Same per-particle shape; spawn/age/cull
            shared. */}
        <ParticleEmitter game={game} spec={buildCompleteArchetype} />
        <ParticleEmitter game={game} spec={sawdustArchetype} />
        <ParticleEmitter game={game} spec={victoryConfettiArchetype} />
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
      <ParticleEmitter game={game} spec={rainArchetype} />
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
  // M_AUDIT2.SEC2.28 — pause the render loop while the page is hidden.
  // Without this r3f keeps drawing 60fps in a background tab, draining
  // the battery on phones with no perceptible benefit. 'always' resumes
  // when visible; 'never' parks the loop entirely while hidden. The
  // koota world's update tick is wall-clock driven by the EconomyTick
  // useFrame() callback, so pausing here also pauses simulation — which
  // is the correct behaviour (no surprise weather changes / training
  // completions while the user has the app in the background).
  const visible = useDocumentVisible();
  return (
    <Canvas
      shadows={{ type: PCFSoftShadowMap }}
      camera={{ position: [0, 55, 62], fov: viewport.camera.fov }}
      style={{ position: 'absolute', inset: 0 }}
      frameloop={visible ? 'always' : 'never'}
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

/** Tracks document.visibilityState; rerenders the host on change. */
function useDocumentVisible(): boolean {
  const [visible, setVisible] = useState(
    typeof document === 'undefined' ? true : document.visibilityState === 'visible',
  );
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const update = () => setVisible(document.visibilityState === 'visible');
    document.addEventListener('visibilitychange', update);
    return () => document.removeEventListener('visibilitychange', update);
  }, []);
  return visible;
}
