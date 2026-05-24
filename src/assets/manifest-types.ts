/** A single curated asset entry in the generated manifest. */
export interface AssetEntry {
  /** Stable logical id, e.g. "board.tile.grass" or "audio.sfx.footstep.grass". */
  id: string;
  /** Path relative to the site base, e.g. "assets/board/grass.glb". */
  path: string;
  /** Top-level domain: board | nature | structures | siege | characters | audio. */
  category: string;
  /** "glb" | "ogg" | "wav". */
  kind: 'glb' | 'ogg' | 'wav';
  /** Triangle count for GLB assets; undefined for audio. */
  triangles?: number;
  /** Animation clip names for rigged GLB assets; empty for static meshes/audio. */
  animations: string[];
  /** Source pack name, for the credits screen. */
  pack: string;
}

/** The full generated asset manifest. */
export interface AssetManifest {
  /** ISO timestamp the manifest was generated. */
  generatedAt: string;
  /** Every curated asset, keyed by logical id. */
  entries: Record<string, AssetEntry>;
}
