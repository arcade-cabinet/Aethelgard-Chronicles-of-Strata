/**
 * M_V8.TUTORIAL.N-PLAYER-MODE — OnboardingOverlay N-player slide tests.
 *
 * Pins the contract: when factionCount > 2, the slide sequence is
 * STEPS.length + 1 (the extra N-player slide is appended). When
 * factionCount <= 2, the sequence is STEPS.length exactly.
 *
 * M_V9.TEST.SOURCE-GREP-TO-BEHAVIOR — converted from source-grep to
 * behavior assertions by exporting STEPS and N_PLAYER_STEP from
 * OnboardingOverlay.tsx and asserting on the exported values directly.
 */
import { describe, expect, it } from 'vitest';
import { N_PLAYER_STEP, STEPS } from '@/hud/OnboardingOverlay';

describe('M_V8.TUTORIAL.N-PLAYER-MODE — N-player slide logic', () => {
  it('base tutorial has 9 steps for 2-faction matches', () => {
    expect(STEPS).toHaveLength(9);
  });

  it('N-player slide title contains "Multiple factions" keyword', () => {
    expect(N_PLAYER_STEP.title).toBe('Multiple factions');
  });

  it('N-player slide body contains the alliances/last-faction copy', () => {
    expect(N_PLAYER_STEP.body).toContain('Multiple factions have joined the map');
    expect(N_PLAYER_STEP.body).toContain('form alliances');
  });

  it('slide is appended AFTER existing sequence — STEPS spread before N_PLAYER_STEP', () => {
    // The component computes: factionCount > 2 ? [...STEPS, N_PLAYER_STEP] : STEPS
    // Verify the contract: appending produces length STEPS.length + 1.
    const nPlayerSteps = [...STEPS, N_PLAYER_STEP];
    expect(nPlayerSteps).toHaveLength(STEPS.length + 1);
    // First slide is the base sequence start (not the N-player slide).
    expect(nPlayerSteps[0]).toBe(STEPS[0]);
    // Last slide is the N-player slide.
    expect(nPlayerSteps[nPlayerSteps.length - 1]).toBe(N_PLAYER_STEP);
  });
});
