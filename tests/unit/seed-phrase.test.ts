import { describe, expect, it } from 'vitest';
import { randomSeedPhrase } from '@/core/seed-phrase';
import { createEventPrng } from '@/core/rng';

describe('seed phrase', () => {
  it('produces an adjective-adjective-noun phrase', () => {
    const phrase = randomSeedPhrase(createEventPrng('test'));
    expect(phrase.split('-')).toHaveLength(3);
  });

  it('produces lower-cased, hyphen-joined phrases', () => {
    const phrase = randomSeedPhrase(createEventPrng('test'));
    expect(phrase).toBe(phrase.toLowerCase());
    expect(phrase).not.toContain(' ');
  });

  it('is deterministic for the same event PRNG state', () => {
    const a = createEventPrng('seed-phrase-test');
    const b = createEventPrng('seed-phrase-test');
    expect(randomSeedPhrase(a)).toBe(randomSeedPhrase(b));
  });

  it('produces varied phrases across different PRNG seeds', () => {
    const phrases = Array.from({ length: 30 }, (_, i) =>
      randomSeedPhrase(createEventPrng(`varied-seed-${i}`)),
    );
    expect(new Set(phrases).size).toBeGreaterThan(1);
  });
});
