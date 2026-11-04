import type { Med } from './types';

/**
 * Sample items for the app. `resetAndSeed()` loads them on app start.
 * The names are made up, and they are not a medical schedule.
 */
export const SEED_MEDS: Med[] = [
  { id: 'sample-a', name: 'Sample A', interval: 4, offset: 0 },
  { id: 'sample-b', name: 'Sample B', interval: 6, offset: 0 },
  { id: 'sample-c', name: 'Sample C', interval: 8, offset: 0 },
  { id: 'sample-d', name: 'Sample D', interval: 12, offset: 0 },
  { id: 'sample-e', name: 'Sample E', interval: 12, offset: 0 },
  { id: 'sample-f', name: 'Sample F', interval: 24, offset: 0 },
];
