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
export function CameraRig({ viewport, boardRadius }: CameraRigProps) {
  const controlsRef = useRef<MapControlsHandle>(null);
  const camera = useThree((s) => s.camera);

  // world-space half-extent the camera target may roam within
  const panLimit = boardRadius * HEX_RADIUS * 1.7;

  // apply the viewport profile's framing whenever the viewport class changes
  useEffect(() => {
    const { distance, pitch, fov } = viewport.camera;
    // place the camera at `distance` along a vector pitched down by `pitch`
    const horiz = Math.cos(pitch) * distance;
    const vert = Math.sin(pitch) * distance;
    camera.position.set(0, vert, horiz);
    camera.lookAt(0, 0, 0);
    if ('fov' in camera) {
      (camera as { fov: number }).fov = fov;
      (camera as { updateProjectionMatrix: () => void }).updateProjectionMatrix();
    }
    controlsRef.current?.target.set(0, 0, 0);
    controlsRef.current?.update();
  }, [viewport, camera]);

  // on every controls change: clamp the pan target to the board bounds, then
  // publish the camera view so the minimap can draw the current slice.
  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;
    const onChange = () => {
      const t = controls.target;
      t.x = Math.max(-panLimit, Math.min(panLimit, t.x));
      t.z = Math.max(-panLimit, Math.min(panLimit, t.z));
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
  }, [panLimit, camera]);

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
      t.x = Math.max(-panLimit, Math.min(panLimit, t.x + worldDx));
      t.z = Math.max(-panLimit, Math.min(panLimit, t.z + worldDz));
      camera.position.x += worldDx;
      camera.position.z += worldDz;
      controls.update();
    };
    window.addEventListener('aethelgard:pan-camera', handler);
    return () => window.removeEventListener('aethelgard:pan-camera', handler);
  }, [panLimit, camera]);

  return (
    <MapControls
      ref={controlsRef}
      enableDamping
      dampingFactor={0.12}
      minDistance={WORLD.camera.minZoom}
      maxDistance={WORLD.camera.maxZoom}
      maxPolarAngle={Math.PI / 2.2}
      // keep the board upright — no full orbit, just RTS-style pan + pitch
      minAzimuthAngle={-Math.PI / 4}
      maxAzimuthAngle={Math.PI / 4}
    />
  );
}
