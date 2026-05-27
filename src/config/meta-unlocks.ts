/**
 * M_V11.META-PROGRESSION — cross-match meta-unlocks registry.
 *
 * Each entry is a permanent unlock the player buys with lore tokens
 * earned across match wins. Persistence lives in the `meta_unlocks`
 * sqlite table (see src/persistence/persistence.ts). The AtelierScreen
 * HUD reads this registry to render the unlocks list; runtime gameplay
 * checks `persistence.isMetaUnlocked(id)` to gate the starter bonuses.
 *
 * Categories:
 *   - starting-units      : pre-trained units at match start
 *   - starting-buildings  : pre-built buildings at match start
 *   - palette-skins       : optional faction palette overrides
 *   - named-heroes        : variant Hero units with unique abilities
 *   - ai-bounties         : challenge modes (win → bonus lore tokens)
 *   - lore-chapters       : story chapters readable from main menu
 *
 * See docs/specs/GAME-DESIGN-AUDIT.md task #77c for the design intent.
 */
import { z } from 'zod';
import metaUnlocksJson from './meta-unlocks.json';

export type MetaUnlockCategory =
  | 'starting-units'
  | 'starting-buildings'
  | 'palette-skins'
  | 'named-heroes'
  | 'ai-bounties'
  | 'lore-chapters';

const MetaUnlockSchema = z.object({
  id: z.string().min(1),
  category: z.enum([
    'starting-units',
    'starting-buildings',
    'palette-skins',
    'named-heroes',
    'ai-bounties',
    'lore-chapters',
  ]),
  name: z.string().min(1),
  description: z.string().min(1),
  cost: z.number().int().positive(),
});

const MetaUnlocksConfigSchema = z.object({
  unlocks: z.array(MetaUnlockSchema).min(1),
});

export type MetaUnlock = z.infer<typeof MetaUnlockSchema>;

export const META_UNLOCKS_CONFIG = MetaUnlocksConfigSchema.parse(metaUnlocksJson);
export const META_UNLOCKS: ReadonlyArray<MetaUnlock> = META_UNLOCKS_CONFIG.unlocks;
export const META_UNLOCKS_BY_ID = new Map(META_UNLOCKS.map((u) => [u.id, u]));

/** Group unlocks by category for the AtelierScreen rendering. */
export function metaUnlocksByCategory(): Map<MetaUnlockCategory, MetaUnlock[]> {
  const out = new Map<MetaUnlockCategory, MetaUnlock[]>();
  for (const u of META_UNLOCKS) {
    if (!out.has(u.category)) out.set(u.category, []);
    out.get(u.category)?.push(u);
  }
  return out;
}

/** Lore-token earn rule for a completed match.
 *  - win on easy   → 1 token
 *  - win on normal → 2 tokens
 *  - win on hard   → 3 tokens
 *  - loss/draw     → 0 tokens (still get the Atelier visit) */
export function loreTokenReward(
  outcome: 'win' | 'loss' | 'draw',
  difficulty: 'easy' | 'normal' | 'hard',
): number {
  if (outcome !== 'win') return 0;
  if (difficulty === 'easy') return 1;
  if (difficulty === 'normal') return 2;
  return 3;
}
