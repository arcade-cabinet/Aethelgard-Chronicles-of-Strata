/**
 * M_FUN.FOUNDATION.ZOD-CONFIG — Zod-validated typed accessor for
 * `credits.json`. Replaces the inline `as ReadonlyArray<CreditSection>`
 * cast in CreditsModal.tsx; a localisation pass or asset-pack
 * rotation that drops a `license` field now fails at module load.
 */
import { z } from 'zod';
import creditsJson from './credits.json';

const CreditEntrySchema = z.object({
  name: z.string().min(1),
  license: z.string().min(1),
  author: z.string().optional(),
  // Zod's `url()` is deprecated in v4; the credits JSON URLs are
  // author/license links, not security-critical — a plain string
  // with a minimum length is sufficient.
  url: z.string().min(1).optional(),
});

const CreditSectionSchema = z.object({
  heading: z.string().min(1),
  entries: z.array(CreditEntrySchema),
});

export type CreditSection = z.infer<typeof CreditSectionSchema>;

const _validated = z.array(CreditSectionSchema).parse(creditsJson);

/** The validated credits table. Import this — never `credits.json` directly. */
export const CREDITS: ReadonlyArray<CreditSection> = _validated;
