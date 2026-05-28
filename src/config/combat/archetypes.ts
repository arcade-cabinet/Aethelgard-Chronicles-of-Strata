/**
 * M_PIVOT.ARCHETYPES — typed accessor + Zod parse for archetypes.json.
 *
 * The JSON registry maps each `FactionArchetype` ('medieval', 'orc',
 * 'undead', 'mystic') to per-building MESH definitions + SFX cue keys
 * + a small particle palette. A faction's `archetype` field drives
 * runtime lookup: `archetypeFor(faction.archetype).buildings[type]`.
 *
 * v0.5 substrate ships:
 *   - 4 archetypes declared (medieval is the player default; orc /
 *     undead / mystic are baseline copies of medieval, ready for
 *     M_PIVOT.BARBARIAN-CAMPS to give each its distinct mesh palette).
 *   - Zod schema validation at module load so adding a 5th archetype
 *     fails fast on missing buildings / typoed mesh ids.
 *
 * Future work (M_PIVOT.RENDER.COLOR-OUTLINE): BuildingRenderer reads
 * `archetypes[faction.archetype].buildings[buildingType].meshLogicalId`
 * instead of the historical `SKINS[faction].structure[type]` table.
 */
import { z } from 'zod';
import archetypesJson from './archetypes.json';
import type { FactionArchetype } from '../factions';

const BuildingMeshSchema = z.object({
  meshLogicalId: z.string().min(1),
  scale: z.number().positive(),
  yOffset: z.number(),
});

const SfxKeysSchema = z.object({
  build: z.string(),
  completed: z.string(),
  destroyed: z.string(),
});

const ParticlePaletteSchema = z.object({
  dust: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  ember: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  smoke: z.string().regex(/^#[0-9a-fA-F]{6}$/),
});

const ArchetypeSchema = z.object({
  displayName: z.string().min(1),
  // Buildings is a free-form record so the JSON can keep its BuildingType
  // keys without a literal union enum in Zod (the source-of-truth for
  // BuildingType lives in components.ts).
  buildings: z.record(z.string(), BuildingMeshSchema),
  sfx: SfxKeysSchema,
  particlePalette: ParticlePaletteSchema,
});

const ArchetypesFileSchema = z.object({
  archetypes: z.record(z.string(), ArchetypeSchema),
});

/** Strip the leading `$comment` key from JSON before Zod parse. */
function stripComments(input: unknown): unknown {
  if (Array.isArray(input)) return input.map(stripComments);
  if (input && typeof input === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
      if (k === '$comment') continue;
      out[k] = stripComments(v);
    }
    return out;
  }
  return input;
}

const _parsed = ArchetypesFileSchema.parse(stripComments(archetypesJson));

/** Per-building mesh + transform — the shape every renderer reads. */
export interface BuildingMesh {
  meshLogicalId: string;
  scale: number;
  yOffset: number;
}

/** SFX cue keys triggered by a building's lifecycle events. */
export interface ArchetypeSfx {
  build: string;
  completed: string;
  destroyed: string;
}

/** Small particle-emitter color palette per archetype. */
export interface ArchetypeParticlePalette {
  dust: string;
  ember: string;
  smoke: string;
}

/** One archetype's complete renderer contract. */
export interface Archetype {
  displayName: string;
  buildings: Record<string, BuildingMesh>;
  sfx: ArchetypeSfx;
  particlePalette: ArchetypeParticlePalette;
}

/**
 * The validated archetypes registry. Indexed by archetype id.
 * Module-level so the Zod parse runs once at app boot — any schema
 * drift fails fast at startup, not at first render.
 */
export const ARCHETYPES: Record<string, Archetype> = _parsed.archetypes;

/**
 * Look up an archetype by id; throws if the id is unknown. Use when
 * the lookup is structurally guaranteed (e.g. iterating
 * `factionIds(game.factions)` and reading config). The thrown error
 * lists the available archetypes for fast diagnosis.
 */
export function archetypeFor(id: FactionArchetype): Archetype {
  const a = ARCHETYPES[id];
  if (!a) {
    throw new Error(
      `[archetypes] unknown archetype "${id}" — known: ${Object.keys(ARCHETYPES).join(', ')}`,
    );
  }
  return a;
}

/**
 * Look up a building's mesh for a given archetype. Returns null when
 * the archetype doesn't declare that building (e.g. a future
 * 'no-walls' archetype that skips Wall). Renderers fall back to a
 * sensible default (the medieval Wall mesh) when this returns null.
 */
export function buildingMeshFor(
  archetypeId: FactionArchetype,
  buildingType: string,
): BuildingMesh | null {
  return archetypeFor(archetypeId).buildings[buildingType] ?? null;
}
