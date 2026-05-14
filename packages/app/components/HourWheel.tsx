import { type ReactNode } from 'react';
import { StyleSheet, Text, type TextStyle, type ViewStyle } from 'react-native';
import { GlassView } from 'expo-glass-effect';
import { useHaptics } from '../lib/useHaptics';
import { useWheelDrag } from '../lib/useWheelDrag';
import { Wheel } from './Wheel';

const defaultFormatLabel = (h: number): string => {
  if (h === 0) return '12a';
  if (h < 12) return `${h}a`;
  if (h === 12) return '12p';
  return `${h - 12}p`;
};

export type HourWheelTileInfo = {
  hour: number;
  index: number;
  label: string;
};

export type HourWheelProps = {
  ringSize: number;
  interval: number;
  offset: number;

  onChange?: (offset: number) => void;
  onCommit?: (offset: number) => void;
  onLongPress?: () => void;

  formatLabel?: (hour: number) => string;

  style?: ViewStyle;
  tickStyle?: ViewStyle;
  tileStyle?: ViewStyle;
  tileTextStyle?: TextStyle;

  renderTile?: (info: HourWheelTileInfo) => ReactNode;

  longPressMs?: number;
};

/**
 * Hour-domain composition: useHaptics + useWheelDrag + Wheel. The wheel
 * primitive doesn't know anything about hours; this component adds the
 * formatting and the default frosted-glass tile look.
 */
export function HourWheel({
  ringSize,
  interval,
  offset,
  onChange,
  onCommit,
  onLongPress,
  formatLabel = defaultFormatLabel,
  style,
  tickStyle,
  tileStyle,
  tileTextStyle,
  renderTile,
  longPressMs,
}: HourWheelProps) {
  const haptics = useHaptics();

  const drag = useWheelDrag({
    ringSize,
    interval,
    offset,
    onChange,
    onCommit,
    onTick: haptics.tick,
    onLongPress: () => {
      haptics.impact();
      onLongPress?.();
    },
    longPressMs,
  });

  return (
    <Wheel
      ringSize={ringSize}
      tilePositions={drag.tilePositions}
      dragFractionAnim={drag.dragFractionAnim}
      panHandlers={drag.panHandlers}
      onScaleLayout={drag.onScaleLayout}
      style={style}
      tickStyle={tickStyle}
      renderTile={({ index }) => {
        const hour = (index * interval + drag.currentOffset) % ringSize;
        const label = formatLabel(hour);
        if (renderTile) return renderTile({ hour, index, label });
        return (
          <GlassView
            glassEffectStyle="clear"
            colorScheme="dark"
            style={[s.glass, tileStyle]}
          >
            <Text style={[s.hour, tileTextStyle]}>{label}</Text>
          </GlassView>
        );
      }}
    />
  );
}

const s = StyleSheet.create({
  glass: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderRadius: 10,
  },
  hour: { color: '#fff', fontSize: 22, fontWeight: '600' },
});
