import type { ViewStyle } from 'react-native';
import type { GridStrategy } from './lib/layout';

export type Med = {
  id: string;
  name: string;
  interval: number;
  offset: number;
};

export type MedTileProps = {
  med: Med;
  offset: number;
  setOffset: (v: number) => void;
  expanded: boolean;
  onToggle: () => void;
  compressedStyle: ViewStyle;
  now: Date;
};

export const SEED_MEDS: Med[] = [
  { id: 'ipratropium', name: 'ipratropium bromide', interval: 12, offset: 0 },
  { id: 'benzonatate', name: 'benzonatate', interval: 8, offset: 0 },
  { id: 'acetaminophen', name: 'acetaminophen', interval: 6, offset: 0 },
  { id: 'albuterol', name: 'albuterol sulfate', interval: 4, offset: 0 },
  { id: 'flonase', name: 'flonase', interval: 24, offset: 0 },
  { id: 'allegra', name: 'allegra', interval: 24, offset: 0 },
];

// Cycle through these to compare layouts (hot-reload picks up the change):
export const GRID_STRATEGY: GridStrategy = 'two-cols';
