/**
 * M_FUN.AI.TAUNT — convert an AiPlayer.lastGoal change to a
 * player-facing aria-live announcement.
 *
 * Goal slugs are internal (build:Farm, train:Footman, defend,
 * move-military, patrol, resign). Map each to a player-readable
 * line that includes the opponent's NAME so the player learns
 * the matchup. Lines are intentionally short so they don't
 * dominate the aria-live stream.
 */
import { announce } from '@/hud/aria-live-bus';

const VERB_TEMPLATES: Record<string, (name: string, detail?: string) => string> = {
  build: (name, detail) => `${name} fortifies (${detail ?? 'building'})`,
  train: (name, detail) => `${name} musters (${detail ?? 'unit'})`,
  defend: (name) => `${name} circles their banner`,
  'move-military': (name) => `${name} marches forward`,
  patrol: (name) => `${name} patrols their lands`,
  resign: (name) => `${name} surrenders the field`,
};

const DEFAULT_TEMPLATE = (name: string, goal: string) => `${name} acts (${goal})`;

export function announceAiTaunt(opponentName: string, goalSlug: string): void {
  // goalSlug is "verb" OR "verb:detail" (build:Farm, train:Footman).
  // split(':', 2) — verb is always defined; detail is undefined for verb-only.
  const [verb, detail] = goalSlug.split(':', 2);
  const tmpl = verb ? VERB_TEMPLATES[verb] : undefined;
  const text = tmpl ? tmpl(opponentName, detail) : DEFAULT_TEMPLATE(opponentName, goalSlug);
  announce(text);
}
