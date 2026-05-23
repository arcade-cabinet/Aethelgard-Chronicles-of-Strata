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
      const t = controls.target;
      t.x = Math.max(-panLimit, Math.min(panLimit, t.x + detail.dx));
      t.z = Math.max(-panLimit, Math.min(panLimit, t.z + detail.dz));
      camera.position.x += detail.dx;
      camera.position.z += detail.dz;
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
