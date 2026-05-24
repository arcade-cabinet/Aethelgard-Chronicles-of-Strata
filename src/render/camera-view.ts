/**
 * Shared camera-view state — the current pan target and zoom of the game
 * camera. `CameraRig` writes it each time the controls change; `Minimap` reads
 * it to draw the viewport rectangle showing which slice of the board the player
 * is looking at. Presentation state, deliberately outside the simulation
 * `GameState`. See `docs/specs/98-viewport-and-config.md` Part 4.
 */

/** The camera's current framed view of the board. */
export interface CameraView {
  /** World-X the camera is centred on. */
  targetX: number;
  /** World-Z the camera is centred on. */
  targetZ: number;
  /** Current camera distance (zoom) — small = close, large = far. */
  distance: number;
  /**
   * M_EXPANSION.AU.48 — camera yaw around world-up (radians).
   * 0 = looking along -Z (north). Used by playSoundAt to compute
   * stereo pan for in-world events.
   */
  azimuth: number;
}

/** The live camera view. Mutated in place by `CameraRig`. */
export const cameraView: CameraView = {
  targetX: 0,
  targetZ: 0,
  distance: 60,
  azimuth: 0,
};
