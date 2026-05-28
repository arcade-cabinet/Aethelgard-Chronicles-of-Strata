/**
 * Goal-driven AI player for one faction (spec 100/101/102).
 *
 * M_FUN.REFACTOR.AI-SPLIT — this file is now a thin orchestrator.
 * All evaluators live in src/ai/evaluators/, shared helpers in src/ai/helpers.ts.
 *
 * `AiPlayer extends GameEntity` so it can own a yuka `Think` brain. The brain
 * arbitrates a small set of `GoalEvaluator`s — one per *commander verb* — that
 * score desires from the faction's KNOWN (zone + observed) state and then
 * issue commands through the SAME `commands.ts` channel a human uses. All
 * legality lives in `src/rules/`; the AI is thin scoring + dispatch.
 *
 * Modeled on pond-warfare's Governor pattern. No `scout` goal — peons auto-
 * claim by exploitation (spec 101); exploration is emergent.
 */
import { GameEntity, Think } from 'yuka';
import { DEFAULT_PERSONALITY, personalityFor } from '@/config/ai';
import { FactionTrait, type Faction, Unit } from '@/ecs/components';
import { trainUnit } from '@/game/utilities';
import type { GameState } from '@/game/game-state';
import { BuildEvaluator } from './evaluators/build';
import { DiplomaticEvaluator } from './evaluators/diplomatic';
import { MilitaryEvaluator } from './evaluators/military';
import { PatrolEvaluator } from './evaluators/patrol';
import { ResignEvaluator } from './evaluators/resign';
import { TrainEvaluator } from './evaluators/train';
import { WonderEvaluator } from './evaluators/wonder';
import { announceAiTaunt } from './taunt';

/** The Think brain over the AiPlayer's evaluators. */
class AiBrain extends Think<AiPlayer> {}

/** Default rage-quit threshold (sim-seconds) when not specified by personality. */
const DEFAULT_RAGE_QUIT_THRESHOLD = 180;

/** AiPlayer owns this minimal context — the slice rules + commands read. */
export class AiPlayer extends GameEntity {
  /** Live game pointer set each tick by `update`. */
  game!: GameState;
  readonly faction: Faction;
  readonly brain: AiBrain;
  /** Game-seconds between brain arbitrations — a human-like cadence. */
  private decisionInterval = 3;
  private elapsed = 0;
  /** Name of the goal chosen on the last arbitration — for tests / transcripts. */
  lastGoal: string | null = null;

  /** Seconds the faction has been "starved" (M_MODES.10) — accumulates across ticks. */
  starvedFor = 0;

  /**
   * M_V11.OPEN.AI-SYMMETRY — auto-queue 2 peons on the first AI
   * tick so AI factions match the player's classic-RTS opening
   * (player starts with 80 wood + 60 stone + queues 2 peons from
   * the Palace via the affordance halo).
   */
  private firstTickDone = false;

  /**
   * M_FUN.AI.NAMED — opponent personality key (e.g. 'the-builder',
   * 'the-raider'). Multiplies per-Evaluator desirability so each
   * named opponent plays a distinct style. Defaults to the
   * 'default' personality from ai-personalities.json.
   */
  readonly personalityKey: string;

  constructor(faction: Faction, personalityKey?: string) {
    super();
    this.faction = faction;
    this.personalityKey = personalityKey ?? DEFAULT_PERSONALITY;
    const p = personalityFor(this.personalityKey);
    // M_FUN.REFACTOR.AI-SPLIT — rageQuitThreshold moved from inline
    // const to per-personality JSON field so different personalities
    // rage-quit at different sim-second landmarks.
    const rageQuit = p.rageQuitThreshold ?? DEFAULT_RAGE_QUIT_THRESHOLD;
    this.brain = new AiBrain(this);
    this.brain.addEvaluator(new BuildEvaluator(p.weights.build, rageQuit));
    // M_V9.AI.WONDER-EVALUATOR — Wonder verb slotted between Build and Train.
    // It fires only when the faction can afford the Wonder and has no existing one.
    this.brain.addEvaluator(new WonderEvaluator(p.wonderWeight ?? 0.5));
    // M_FUN.QA.AIVAI.TUNE — train inherits the military weight (not
    // build) since training units IS military investment. This
    // closes the Builder-vs-Builder loop where both sides built
    // forever without ever fielding a unit.
    this.brain.addEvaluator(new TrainEvaluator(p.weights.military));
    this.brain.addEvaluator(new MilitaryEvaluator(p.weights.military, rageQuit));
    // M_EXPANSION.S.55 — patrol verb (verb 5 of 5). Idle military
    // units circulate the zone perimeter when there's no enemy in
    // sight + no defensive trigger.
    this.brain.addEvaluator(new PatrolEvaluator(p.weights.patrol, rageQuit));
    // M_V8.AI.DIPLO-EVALUATOR — diplomacy verb: propose pacts, demand
    // tribute, accept tribute when clearly weaker. Priority: below
    // Military (combat wins over diplomacy), above Patrol (diplomacy
    // over idle patrol). Weight: 0.4 × personalityMul.
    this.brain.addEvaluator(new DiplomaticEvaluator(p.weights.patrol));
    this.brain.addEvaluator(new ResignEvaluator());
  }

  /**
   * Drive the AI for `delta` game-seconds against the current `game`. Named
   * `tick` (not `update`) to avoid shadowing yuka's GameEntity.update.
   */
  tick(game: GameState, delta: number): void {
    this.game = game;
    // M_V11.OPEN.AI-SYMMETRY — on the first tick the AI sees, fire
    // two trainUnit('Peon') calls so AI factions match the
    // player's RTS opening (player starts at 80 wood / 60 stone /
    // no peons; the affordance halo nudges them to queue 2).
    // Without this, AI factions sit idle indefinitely waiting for
    // BuildEvaluator to surface, which doesn't have peon-queue
    // logic since it expects peons to already exist.
    if (!this.firstTickDone) {
      this.firstTickDone = true;
      // Gate on faction having NO peons yet (handles deserialize
      // path: a restored game already has the peons, fresh
      // AiPlayer instance shouldn't double-queue).
      let hasPeon = false;
      for (const e of game.world.query(Unit, FactionTrait)) {
        if (e.get(FactionTrait)?.faction !== this.faction) continue;
        if (e.get(Unit)?.unitType === 'Peon') {
          hasPeon = true;
          break;
        }
      }
      if (!hasPeon) {
        trainUnit(game, 'Peon', this.faction);
        trainUnit(game, 'Peon', this.faction);
      }
    }
    // Accumulate starvation continuously (independent of decisionInterval) —
    // ResignEvaluator reads this each arbitration.
    const zone = game.zones[this.faction];
    const eco = game.economy[this.faction];
    const starved = zone.controlled.size === 0 && eco.wood < 10 && eco.gold < 10 && eco.stone < 10;
    this.starvedFor = starved ? this.starvedFor + delta : 0;
    this.elapsed += delta;
    if (this.elapsed < this.decisionInterval) return;
    this.elapsed -= this.decisionInterval;
    const prevGoal = this.lastGoal;
    this.brain.arbitrate();
    this.brain.execute();
    // M_FUN.AI.TAUNT — announce the AI's new goal via aria-live when
    // it changes (enemy faction only; ally announcements would clutter
    // the screen-reader stream). Player-faction AI in AI-vs-AI mode
    // doesn't taunt — only the OPPONENT does.
    if (this.faction === 'enemy' && this.lastGoal && this.lastGoal !== prevGoal) {
      const p = personalityFor(this.personalityKey);
      announceAiTaunt(p.displayName, this.lastGoal);
    }
  }
}
