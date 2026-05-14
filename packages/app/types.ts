import type { ViewStyle } from 'react-native';

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
