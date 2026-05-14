import type { ViewStyle } from 'react-native';
import type { GridStrategy } from './lib/layout';

export type Med = { name: string; interval: number };

export type MedTileProps = {
  med: Med;
  offset: number;
  setOffset: (v: number) => void;
  expanded: boolean;
  onToggle: () => void;
  compressedStyle: ViewStyle;
  now: Date;
};

export const MEDS: Med[] = [
  { name: 'ipratropium bromide', interval: 12 },
  { name: 'benzonatate', interval: 8 },
  { name: 'acetaminophen', interval: 6 },
  { name: 'albuterol sulfate', interval: 4 },
  { name: 'flonase', interval: 24 },
  { name: 'allegra', interval: 24 },
];

// Cycle through these to compare layouts (hot-reload picks up the change):
export const GRID_STRATEGY: GridStrategy = 'two-cols';

export const STORAGE_KEY_OFFSETS = '@meds/offsets';
