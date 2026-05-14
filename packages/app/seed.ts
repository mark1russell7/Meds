import type { Med } from './types';

/**
 * Initial medication set loaded on app start by `resetAndSeed()`.
 * Each entry's `id` is the stable key used everywhere; renaming `name` is fine,
 * renaming `id` would orphan any persisted offset (since offsets are keyed by id).
 */
export const SEED_MEDS: Med[] = [
  { id: 'ipratropium', name: 'ipratropium bromide', interval: 12, offset: 0 },
  { id: 'benzonatate', name: 'benzonatate', interval: 8, offset: 0 },
  { id: 'acetaminophen', name: 'acetaminophen', interval: 6, offset: 0 },
  { id: 'albuterol', name: 'albuterol sulfate', interval: 4, offset: 0 },
  { id: 'flonase', name: 'flonase', interval: 24, offset: 0 },
  { id: 'allegra', name: 'allegra', interval: 24, offset: 0 },
];
