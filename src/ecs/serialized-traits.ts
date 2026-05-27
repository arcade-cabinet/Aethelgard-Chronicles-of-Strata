/**
 * M_REGISTRY.25 — serialized-trait registry.
 *
 * Extracted from src/ecs/components.ts to keep that file under the
 * 600-line code-quality threshold (CodeRabbit PR #89). The registry
 * remains the single source of truth for which traits round-trip
 * across save/load.
 *
 * Per the user's `ONE UNIFIED PRODUCTION CODEBASE` doctrine: a
 * hand-built parallel registry in persistence/serialize.ts (the
 * pre-M_REGISTRY.25 shape) silently DROPPED archetype traits
 * (OffensiveBehavior, DefensiveBehavior, AttractorBehavior,
 * MoverBehavior, ConsumerBehavior, Gate, ScienceProducer) — placed
 * Walls / Watchtowers / Wonders / Roads / Libraries lost their
 * archetype roles after a save/load round-trip. Centralizing the
 * registry makes the inclusion explicit; this file remains the
 * single edit-point when adding a new round-tripped trait.
 *
 * IMPORTANT: order MATTERS. serialize.ts iterates this list to
 * decide query order; changing the order CAN reorder entity ids in
 * deserialize, which breaks save-compat. Add new entries at the END.
 */
import {
  AnimationState,
  AssignedJob,
  AttractorBehavior,
  Building,
  Carrier,
  Combatant,
  CommandedTile,
  ConsumerBehavior,
  DeathTimer,
  DefensiveBehavior,
  EnemySpawner,
  EnemyTarget,
  FactionBase,
  FactionTrait,
  Gate,
  Harvester,
  Health,
  HexPosition,
  LootCache,
  Movement,
  MoverBehavior,
  OffensiveBehavior,
  PathQueue,
  PeonAutonomy,
  ResourceTrait,
  ScienceProducer,
  Selectable,
  Stack,
  StackMember,
  Stance,
  Transform,
  Unit,
  WanderBehavior,
} from './components';

// biome-ignore lint/suspicious/noExplicitAny: registry needs generic trait type
export const SERIALIZED_TRAITS: ReadonlyArray<{ name: string; traitObj: any }> = [
  { name: 'Transform', traitObj: Transform },
  { name: 'HexPosition', traitObj: HexPosition },
  { name: 'Unit', traitObj: Unit },
  { name: 'FactionTrait', traitObj: FactionTrait },
  { name: 'Movement', traitObj: Movement },
  { name: 'PathQueue', traitObj: PathQueue },
  { name: 'AnimationState', traitObj: AnimationState },
  { name: 'Selectable', traitObj: Selectable },
  { name: 'ResourceTrait', traitObj: ResourceTrait },
  { name: 'Harvester', traitObj: Harvester },
  { name: 'Carrier', traitObj: Carrier },
  { name: 'Building', traitObj: Building },
  { name: 'AssignedJob', traitObj: AssignedJob },
  { name: 'Health', traitObj: Health },
  { name: 'Combatant', traitObj: Combatant },
  { name: 'EnemySpawner', traitObj: EnemySpawner },
  { name: 'FactionBase', traitObj: FactionBase },
  { name: 'EnemyTarget', traitObj: EnemyTarget },
  { name: 'DeathTimer', traitObj: DeathTimer },
  // M_REGISTRY.25 — added: ZoC archetype + producer slots that were
  // previously not round-tripped. Without these a saved game lost
  // building behaviors on resume.
  { name: 'OffensiveBehavior', traitObj: OffensiveBehavior },
  { name: 'DefensiveBehavior', traitObj: DefensiveBehavior },
  { name: 'AttractorBehavior', traitObj: AttractorBehavior },
  { name: 'MoverBehavior', traitObj: MoverBehavior },
  { name: 'ConsumerBehavior', traitObj: ConsumerBehavior },
  { name: 'Gate', traitObj: Gate },
  { name: 'ScienceProducer', traitObj: ScienceProducer },
  // M_POLISH2.RTS.16 — stance system traits round-trip across save/load.
  { name: 'Stance', traitObj: Stance },
  { name: 'CommandedTile', traitObj: CommandedTile },
  // M_GAME.STACK.1 — Stack + StackMember round-trip so a saved game
  // resumes with all formations and member back-references intact.
  { name: 'Stack', traitObj: Stack },
  { name: 'StackMember', traitObj: StackMember },
  // M_GAME.MODE.PEON.1 — peon autoMode persists across save/load so
  // a player's commanded peon stays commanded after a reload.
  { name: 'PeonAutonomy', traitObj: PeonAutonomy },
  // M_V11.CAMPS.WANDER — barbarian-camp mob's wander anchor + radius
  // persists across save/load so a reloaded mob keeps its leash.
  { name: 'WanderBehavior', traitObj: WanderBehavior },
  // M_V11.CAMPS.LOOT — un-collected resource caches survive save/load.
  { name: 'LootCache', traitObj: LootCache },
];
