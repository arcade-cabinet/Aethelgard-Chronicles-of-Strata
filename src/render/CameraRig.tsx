import { MapControls } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import { type ComponentRef, useEffect, useRef } from 'react';
import { HEX_RADIUS, WORLD } from '@/config/world';
import { cameraView } from './camera-view';
import type { ViewportProfile } from './useViewport';

/** The imperative handle drei's MapControls exposes via ref. */
type MapControlsHandle = ComponentRef<typeof MapControls>;

/** Props for the camera rig. */
export interface CameraRigProps {
  /** The current viewport profile — sets the default framing. */
  viewport: ViewportProfile;
  /** Board radius in hex tiles — bounds how far the camera may pan. */
  boardRadius: number;
  /**
   * World-space centroid of the walkable land mass. The initial camera
   * target is set here (not the axial origin) so archipelago / offset
   * boards still frame the play area. M_FUN.QA.AIVAI.TUNE.PATTERN-H.
   */
  landCenter: { x: number; z: number };
}

/**
 * The game camera — a framed, pannable, zoomable view of the board (not a fixed
 * whole-board shot). Built on drei `MapControls`: drag pans the target across
 * the board, wheel/pinch zooms within the configured bounds. The viewport
 * profile sets the default distance/pitch/fov, so a portrait phone opens tight
 * on a region while desktop opens wide. The pan target is clamped to the board
 * so the player cannot scroll off into empty ocean.
 * See `docs/specs/98-viewport-and-config.md` Part 4.
 */
export function CameraRig({ viewport, boardRadius, landCenter }: CameraRigProps) {
  const controlsRef = useRef<MapControlsHandle>(null);
  const camera = useThree((s) => s.camera);

  // world-space half-extent the camera target may roam within
  const panLimit = boardRadius * HEX_RADIUS * 1.7;
  const cx = landCenter.x;
  const cz = landCenter.z;

  // apply the viewport profile's framing whenever the viewport class
  // OR the land centroid changes (the latter happens once per board
  // generation; subsequent unit movement does NOT shift the centroid
  // because it's keyed on game.board identity in GameCanvas).
  useEffect(() => {
    const { distance, pitch, fov } = viewport.camera;
    // place the camera at `distance` along a vector pitched down by `pitch`
    const horiz = Math.cos(pitch) * distance;
    const vert = Math.sin(pitch) * distance;
    camera.position.set(cx, vert, cz + horiz);
    camera.lookAt(cx, 0, cz);
    if ('fov' in camera) {
      (camera as { fov: number }).fov = fov;
      (camera as { updateProjectionMatrix: () => void }).updateProjectionMatrix();
    }
    controlsRef.current?.target.set(cx, 0, cz);
    controlsRef.current?.update();
  }, [viewport, camera, cx, cz]);

  // on every controls change: clamp the pan target to the board bounds, then
  // publish the camera view so the minimap can draw the current slice.
  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;
    const onChange = () => {
      const t = controls.target;
      const prevX = t.x;
      const prevZ = t.z;
      // PATTERN-H — pan clamp is centred on landCenter, not the axial
      // origin, so an offset board still pans naturally within bounds.
      t.x = Math.max(cx - panLimit, Math.min(cx + panLimit, t.x));
      t.z = Math.max(cz - panLimit, Math.min(cz + panLimit, t.z));
      // Coderabbit MAJOR PR #10 05:46Z — keep camera in sync when
      // clamp fires during drag. Without this, drag-panning past
      // the limit snaps the target but the camera keeps drifting,
      // breaking the camera↔target invariant orbit-controls expect.
      camera.position.x += t.x - prevX;
      camera.position.z += t.z - prevZ;
      cameraView.targetX = t.x;
      cameraView.targetZ = t.z;
      cameraView.distance = camera.position.distanceTo(t);
      // M_EXPANSION.AU.48 — record camera yaw so playSoundAt can
      // compute stereo pan for in-world events. Yaw is the angle
      // of the camera→target vector in the x/z plane (atan2 of the
      // horizontal projection).
      const dx = t.x - camera.position.x;
      const dz = t.z - camera.position.z;
      cameraView.azimuth = Math.atan2(dx, -dz);
    };
    controls.addEventListener('change', onChange);
    return () => controls.removeEventListener('change', onChange);
  }, [panLimit, camera, cx, cz]);

  // M_AUDIT2.UX.31 — wire arrow-key camera pan. KeyboardShortcuts
  // dispatches a CustomEvent 'aethelgard:pan-camera' { dx, dz } per
  // arrow keypress; we translate the target + camera by that vector
  // (with clamp) and force a controls update so the change event
  // fires and the minimap follows.
  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ dx: number; dz: number }>).detail;
      if (!detail) return;
      // Reviewer-fix (UX.31): project the dx/dz step through the camera's
      // current azimuth so ArrowRight pans in screen-right regardless of
      // how the player has rotated. azimuth = atan2(camera-x-from-target,
      // camera-z-from-target). Without this, a yawed camera pans in
      // disorienting world-axis directions.
      const t = controls.target;
      const dxCam = camera.position.x - t.x;
      const dzCam = camera.position.z - t.z;
      const azimuth = Math.atan2(dxCam, dzCam);
      const cos = Math.cos(azimuth);
      const sin = Math.sin(azimuth);
      const worldDx = detail.dx * cos + detail.dz * sin;
      const worldDz = -detail.dx * sin + detail.dz * cos;
      // Clamp the target to the pan limit, then move the camera by the
      // ACTUAL applied delta (coderabbit MAJOR PR #10 04:56Z). The
      // prior code added the unclamped worldDx/worldDz to camera.position
      // so once the target was clamped the camera drifted off-target,
      // breaking the orbit-controls invariant (camera + target both
      // bounded together).
      const tNewX = Math.max(cx - panLimit, Math.min(cx + panLimit, t.x + worldDx));
      const tNewZ = Math.max(cz - panLimit, Math.min(cz + panLimit, t.z + worldDz));
      const appliedDx = tNewX - t.x;
      const appliedDz = tNewZ - t.z;
      t.x = tNewX;
      t.z = tNewZ;
      camera.position.x += appliedDx;
      camera.position.z += appliedDz;
      controls.update();
    };
    window.addEventListener('aethelgard:pan-camera', handler);
    return () => window.removeEventListener('aethelgard:pan-camera', handler);
  }, [panLimit, camera, cx, cz]);

  return (
    <MapControls
      ref={controlsRef}
      enableDamping
      dampingFactor={0.12}
      minDistance={WORLD.camera.minZoom}
      maxDistance={WORLD.camera.maxZoom}
      // M_GAME.BUG.7 — rotation entirely disabled per user direction
      // (2026-05-25). Aethelgard is one fixed immersive Warcraft-1/2
      // style game-board view; the player ZOOMS to inspect, never
      // rotates. Two-finger drag previously orbited the island; now
      // it pans (MapControls' default for touch when rotate is off).
      enableRotate={false}
      // Lock pitch to a Civ-VI / Warcraft 2.5D pose: ~35° from
      // horizon (polar = π/2 − 35° ≈ 0.96 rad). Mountains stay
      // visible behind closer hexes; the steeper the polar, the
      // more dramatic the tilt and the more mountains occlude the
      // realm. minPolarAngle === maxPolarAngle locks it.
      minPolarAngle={0.96}
      maxPolarAngle={0.96}
    />
  );
}
