/**
 * M_EXPANSION.D.173 — procedural dither texture, extracted from
 * DayNightCycle.tsx so the textures family has a dedicated home.
 *
 * The 4×4 Bayer-thresholded noise texture is multiplied into the
 * sky base color to break 8-bit banding during sunset/sunrise
 * gradients (M_AUDIT2.UX.29). Modulation is ±1 LSB around gray
 * (128) — invisible as 'noise' but enough to break a band.
 *
 * Future textures (cloud-noise sphere, particle sprite atlas, etc.)
 * land alongside this in src/render/textures/.
 */
import { CanvasTexture, RepeatWrapping } from 'three';

export function makeDitherTexture(): CanvasTexture {
  const size = 4;
  const cv = document.createElement('canvas');
  cv.width = size;
  cv.height = size;
  const ctx = cv.getContext('2d');
  if (ctx) {
    const bayer = [
      [0, 8, 2, 10],
      [12, 4, 14, 6],
      [3, 11, 1, 9],
      [15, 7, 13, 5],
    ];
    const img = ctx.createImageData(size, size);
    for (let y = 0; y < size; y++) {
      const row = bayer[y];
      if (!row) continue;
      for (let x = 0; x < size; x++) {
        const cell = row[x];
        if (cell === undefined) continue;
        const v = 126 + (cell / 16) * 4; // 126..130
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
