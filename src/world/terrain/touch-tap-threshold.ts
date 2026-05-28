/**
 * M_POLISH2.MOBILE.6 — pure helper for tap-vs-pan disambiguation.
 *
 * Returns true when the touch movement between pointerdown and
 * pointerup is small enough to count as a TAP (suppress on a pan).
 * Squared comparison avoids the Math.sqrt — same answer, cheaper.
 *
 * Threshold is 6 CSS pixels, matching the platform default touch
 * slop. Adjust here only if a user complains taps are being
 * eaten on a high-DPI device.
 */
export const TAP_THRESHOLD_PX = 6;

export function isTap(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  threshold = TAP_THRESHOLD_PX,
): boolean {
  const dx = endX - startX;
  const dy = endY - startY;
  return dx * dx + dy * dy <= threshold * threshold;
}
