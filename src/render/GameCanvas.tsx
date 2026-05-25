import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { type Camera, PCFSoftShadowMap } from 'three';
import { Building, type BuildingType, HexPosition } from '@/ecs/components';
import { axialToWorld } from '@/core/hex';
import type { GameState } from '@/game/game-state';
import { CombatText } from '@/world/CombatText';
import { Crossings } from '@/world/Crossings';
import { DeathDropLayer } from '@/world/DeathDropLayer';
import { Decoration } from '@/world/Decoration';
import { FactionBase } from '@/world/FactionBase';
import { FootstepEmitter } from '@/world/FootstepEmitter';
import { Mountains } from '@/world/Mountains';
import { ParticleEmitter } from '@/world/ParticleEmitter';
import { ProjectileLayer } from '@/world/ProjectileLayer';
import { VolcanoLayer } from '@/world/VolcanoLayer';
import { WildfireLayer } from '@/world/WildfireLayer';
import { QuakeShake } from './QuakeShake';
import {
  bloodSplashConsumer,
  buildCompleteConsumer,
  chimneySmokeConsumer,
  embersConsumer,
  rainConsumer,
  sawdustConsumer,
  snowConsumer,
  victoryConfettiConsumer,
} from '@/world/particle-consumers';
import { RallyMarker } from '@/world/RallyMarker';
import { ResourceNodes } from '@/world/ResourceNodes';
import { ResourceText } from '@/world/ResourceText';
import { Roads } from '@/world/Roads';
import { SelectionRing } from '@/world/SelectionRing';
import { Terrain } from '@/world/Terrain';
import { HexGridOverlay } from '@/world/HexGridOverlay';
import { type BuildContext, TileInteraction } from '@/world/TileInteraction';
import { TrackingRings, type TrackingRingsHandle } from '@/world/TrackingRings';
import { Units } from '@/world/Units';
import { Water } from '@/world/Water';
import { ContestedPulse } from '@/world/ContestedPulse';
import { ZoneBorder } from '@/world/ZoneBorder';
import { CameraRig } from './CameraRig';
import { DayNightCycle } from './DayNightCycle';
import { SuspenseProbe } from './SuspenseProbe';
import { useGameLoop } from './useGameLoop';
import { useViewport, type ViewportProfile } from './useViewport';

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

  // M_FUN.QA.AIVAI.TUNE.PATTERN-H — initial camera target.
  //
  // User feedback post-v0.4 (AIVAI screenshot battery, 14 landmarks
  // through 10 sim-min): the prior implementation centred on the
  // centroid of walkable LAND tiles, which on continental maps with a
  // big central massif lands INSIDE the mountain — the bases (which
  // sit on the perimeter where land starts) and ALL gameplay action
  // happen off-screen. The user watches a beautiful empty map for the
  // whole match.
  //
  // Fix: prefer the MIDPOINT of player base + enemy base. That's
  // where the two factions actually meet — for border-clash mode it's
  // the optimal framing; for single-player it sits between the home
  // base and the threat. Falls back to the land centroid when either
  // base entity hasn't been spawned yet (asymmetric / early single-
  // player init), then to the axial origin as last resort.
  const landCenter = useMemo<{ x: number; z: number }>(() => {
    // 1. Try the base-pair midpoint first.
    const pBase = game.board.tiles.get(game.townHallKey);
    const eBase = game.board.tiles.get(game.enemyBaseKey);
    if (pBase && eBase) {
      const p = axialToWorld(pBase.q, pBase.r);
      const e = axialToWorld(eBase.q, eBase.r);
      return { x: (p.x + e.x) / 2, z: (p.z + e.z) / 2 };
    }
    // 2. Fallback — land centroid (the prior PATTERN-H implementation).
    let sx = 0;
    let sz = 0;
    let n = 0;
    for (const tile of game.board.tiles.values()) {
      if (!tile.walkable) continue;
      const { x, z } = axialToWorld(tile.q, tile.r);
      sx += x;
      sz += z;
      n++;
    }
    return n > 0 ? { x: sx / n, z: sz / n } : { x: 0, z: 0 };
  }, [game.board, game.townHallKey, game.enemyBaseKey]);

  return (
    <>
      <DayNightCycle game={game} />
      <Terrain board={game.board} />
      <HexGridOverlay board={game.board} />
      <Mountains board={game.board} />
      <Crossings board={game.board} />
      <Water mapRadius={game.board.radius} />
      <TileInteraction
        game={game}
        buildContext={buildContext}
        spawnTrackingRing={(q, r) => ringsRef.current?.spawn(q, r)}
      />
      <TrackingRings ref={ringsRef} board={game.board} />
      {/* M_POLISH3.FB.2 — SuspenseProbe replaces the prior `null`
          fallback. If anything inside this Suspense (GLB loads,
          ParticleEmitter assets, FactionBase models) hangs for
          >5s, console.warn fires + ErrorOverlay surfaces it. */}
      <Suspense fallback={<SuspenseProbe label="GameCanvas inner scene" />}>
        <DecorationLive game={game} occupiedKeys={occupiedKeys} />
        <ResourceNodes game={game} />
        <Roads game={game} />
        {/* M_REGISTRY.6 + M_HIERARCHY.1 — particle consumers mounted
            on the shared ParticleEmitter archetype. Spawn/age/cull
            loop is shared; each consumer tunes spawn cadence + visual. */}
        <ParticleEmitter game={game} spec={buildCompleteConsumer} />
        <ParticleEmitter game={game} spec={sawdustConsumer} />
        {/* M_EXPANSION.A.12 — chimney smoke for every complete House. */}
        <ParticleEmitter game={game} spec={chimneySmokeConsumer} />
        <ParticleEmitter game={game} spec={victoryConfettiConsumer} />
        {/* M_REFACTOR.1 — biome-localized SNOW (over MOUNTAIN tiles only). */}
        <ParticleEmitter game={game} spec={snowConsumer} />
        {/* M_REFACTOR.1 — unit-localized blood splash on combat hits
            (damageType='normal', not parried). */}
        <ParticleEmitter game={game} spec={bloodSplashConsumer} />
        {/* M_REFACTOR.1 — building-localized embers from every
            complete Barracks (the always-on forge tell). */}
        <ParticleEmitter game={game} spec={embersConsumer} />
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
      {/* M_FUN.DYN.WILDFIRE — render burn fronts above the ground
          plane (above projectiles so they read as foreground hazards). */}
      <WildfireLayer game={game} />
      {/* M_FUN.DYN.VOLCANO — magma cap + LAVA discs + fertile-tile
          tints. Renders only when game.volcano.position is set. */}
      <VolcanoLayer game={game} />
      {/* M_FUN.DYN.QUAKE — camera shake while quakeShakeRemaining > 0. */}
      <QuakeShake game={game} />
      <FootstepEmitter game={game} />
      {/* M_EXPANSION.A.17 — coffin death-drop for enemy units. */}
      <DeathDropLayer />
      <ParticleEmitter game={game} spec={rainConsumer} />
      <RallyMarker game={game} />
      <SelectionRing game={game} />
      <ZoneBorder game={game} />
      {/* M_EXPANSION.S.56 — render the contested-tile pulse on top of
          encroached tiles (encroachment system already maintains
          zone.pulsing on the sim side). */}
      <ContestedPulse game={game} />
      <CameraRig viewport={viewport} boardRadius={game.board.radius} landCenter={landCenter} />
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
      // M_POLISH3.B.1 — frameloop must stay 'always' even when
      // document.visibilityState === 'hidden' under Playwright
      // headless (where the tab is technically hidden but tests
      // need the canvas to paint). Gate on the e2e test hook
      // (window.__game) so prod still parks on hidden.
      frameloop={visible || hasTestHook() ? 'always' : 'never'}
      // User feedback post-v0.4 (OnePlus Open foldable unfolded —
      // "going to a solid grey gameboard after a few seconds of
      // play"): on mid-tier Android Adreno GPUs r3f's default
      // settings can drop the WebGL context after a few seconds
      // of heavy draw, and there's no automatic restore. Two fixes:
      // (1) `powerPreference: 'high-performance'` asks the OS for
      //     the discrete/high-perf GPU partition and reduces the
      //     drop rate, and
      // (2) `onCreated` wires a webglcontextlost/restored listener
      //     that prevents the default unrecoverable behaviour and
      //     triggers a full r3f re-render once the context comes back.
      gl={{ powerPreference: 'high-performance', antialias: true, alpha: false }}
      onCreated={({ gl }) => {
        const canvas = gl.domElement;
        const onLost = (e: Event) => {
          // Prevent the browser default — without preventDefault the
          // context is "permanently lost" and the canvas stays grey.
          e.preventDefault();
          console.warn('[GameCanvas] WebGL context LOST — awaiting restore');
        };
        const onRestored = () => {
          console.info('[GameCanvas] WebGL context restored');
          // r3f's renderer rebuilds GPU resources lazily; nudging
          // the size resets the framebuffer + forces a redraw on
          // the next rAF.
          gl.setSize(window.innerWidth, window.innerHeight, false);
        };
        canvas.addEventListener('webglcontextlost', onLost as EventListener, false);
        canvas.addEventListener('webglcontextrestored', onRestored, false);
      }}
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

/**
 * M_POLISH3.B.1 — true when the e2e test hook (`window.__game`) is
 * wired. Used to force frameloop='always' so headless Playwright
 * (which reports the tab as hidden until interaction) paints the
 * scene + test screenshots aren't empty.
 */
function hasTestHook(): boolean {
  if (typeof window === 'undefined') return false;
  return '__game' in window;
}

/** Tracks document.visibilityState; rerenders the host on change. */
function useDocumentVisible(): boolean {
  const [visible, setVisible] = useState(
    typeof document !== 'undefined' ? document.visibilityState !== 'hidden' : true,
  );
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const onChange = () => setVisible(document.visibilityState !== 'hidden');
    document.addEventListener('visibilitychange', onChange);
    return () => document.removeEventListener('visibilitychange', onChange);
  }, []);
  return visible;
}
