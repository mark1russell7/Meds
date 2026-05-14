import type { ViewStyle } from 'react-native';
import { gridLayout, type LayoutStrategy } from './lib/layout';

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
  /** Layout-assigned slot style (size). The tile may override when expanded. */
  style: ViewStyle;
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

// Cycle through layout strategies here — hot-reload picks up the change.
// Alternatives:
//   gridLayout({ cols: 2 })
//   gridLayout({ cols: 3 })
//   gridLayout({ cols: 'auto-square' })
export const LAYOUT: LayoutStrategy = gridLayout({ cols: 2 });
