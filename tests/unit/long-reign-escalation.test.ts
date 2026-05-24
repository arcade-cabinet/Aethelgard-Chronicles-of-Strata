import { describe, expect, it } from 'vitest';
import { startGame } from '@/game/game-state';
import { tickLongReignEscalation } from '@/game/random-events';

describe('M_POLISH2.MODES.41a — long-reign escalation timer', () => {
  function setup() {
    return startGame({
      seedPhrase: 'long-reign-esc-test',
      mapSize: 12,
      difficulty: 'normal',
      eventSeed: 'long-reign-esc-test-ev',
      mode: 'long-reign',
    });
  }

  it('does NOT fire before the first 5-min mark', () => {
    const game = setup();
    const k = tickLongReignEscalation(game, game.eventRng, 299);
    expect(k).toBeNull();
  });

  it('fires at the 5-min mark', () => {
    const game = setup();
    const k = tickLongReignEscalation(game, game.eventRng, 300);
    expect(k).not.toBeNull();
  });

  it('does NOT double-fire if called again at the same elapsed', () => {
    const game = setup();
    tickLongReignEscalation(game, game.eventRng, 300);
    const k2 = tickLongReignEscalation(game, game.eventRng, 305);
    expect(k2).toBeNull();
  });

  it('fires again at the 10-min mark', () => {
    const game = setup();
    tickLongReignEscalation(game, game.eventRng, 300);
    tickLongReignEscalation(game, game.eventRng, 350); // null
    const k = tickLongReignEscalation(game, game.eventRng, 600);
    expect(k).not.toBeNull();
  });

  it('rotates through the 3 kinds in order', () => {
    const game = setup();
    const a = tickLongReignEscalation(game, game.eventRng, 300);
    const b = tickLongReignEscalation(game, game.eventRng, 600);
    const c = tickLongReignEscalation(game, game.eventRng, 900);
    expect(a).toBe('raid-warning');
    expect(b).toBe('weather-spike');
    expect(c).toBe('refugee-arrival');
  });

  it('does NOT fire in non-long-reign modes', () => {
    const game = startGame({
      seedPhrase: 'border-esc-test',
      mapSize: 12,
      difficulty: 'normal',
      eventSeed: 'border-esc-test-ev',
      mode: 'border-clash',
    });
    const k = tickLongReignEscalation(game, game.eventRng, 600);
    expect(k).toBeNull();
  });
});
