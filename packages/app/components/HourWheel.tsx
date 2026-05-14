import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  Animated,
  PanResponder,
  StyleSheet,
  Text,
  View,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { GlassView } from 'expo-glass-effect';
import * as Haptics from 'expo-haptics';

const AnimatedGlassView = Animated.createAnimatedComponent(GlassView);

/**
 * Default formatter — 12-hour clock with am/pm. Override via `formatLabel` for
 * other ring shapes (e.g. mode-12 medication wheel suppresses am/pm).
 */
const defaultFormatLabel = (h: number): string => {
  if (h === 0) return '12a';
  if (h < 12) return `${h}a`;
  if (h === 12) return '12p';
  return `${h - 12}p`;
};

export type HourWheelTileInfo = {
  hour: number;   // hour at this tile in [0, ringSize)
  index: number;  // 0..n-1
  label: string;  // formatLabel(hour)
};

export type HourWheelProps = {
  /** Total positions on the ring (12 or 24 for our use). */
  ringSize: number;
  /** Hours between dose tiles. ringSize must be divisible by interval. */
  interval: number;
  /** Current committed offset (in hours). Synced into the wheel when not dragging. */
  offset: number;

  /** Fired on every integer-hour crossing during a drag. */
  onChange?: (offset: number) => void;
  /** Fired once on gesture release with the final offset. */
  onCommit?: (offset: number) => void;
  /** Fired on long-press (press-and-hold without significant drag). */
  onLongPress?: () => void;

  /** Hour → display string. Defaults to a 12-hour am/pm clock. */
  formatLabel?: (hour: number) => string;

  /** Container style. */
  style?: ViewStyle;
  /** Override the single tick mark (one of `ringSize` rendered). */
  tickStyle?: ViewStyle;
  /** Override the default GlassView dose tile. Ignored if `renderTile` is set. */
  tileStyle?: ViewStyle;
  /** Override the default tile text. Ignored if `renderTile` is set. */
  tileTextStyle?: TextStyle;

  /**
   * Full render-prop escape hatch for the dose tile. The wheel handles
   * positioning (wraps your output in an Animated.View at the right `left`
   * offset); you just render the inside.
   */
  renderTile?: (info: HourWheelTileInfo) => ReactNode;

  /** Long-press hold duration in ms. Defaults to 500. */
  longPressMs?: number;
};

const TILE_WIDTH = 44;

export function HourWheel({
  ringSize,
  interval,
  offset: propOffset,
  onChange,
  onCommit,
  onLongPress,
  formatLabel = defaultFormatLabel,
  style,
  tickStyle,
  tileStyle,
  tileTextStyle,
  renderTile,
  longPressMs = 500,
}: HourWheelProps) {
  const n = ringSize / interval;

  // Local offset for fast in-component updates during drag.
  const [localOffset, setLocalOffset] = useState(propOffset);
  const localOffsetRef = useRef(propOffset);
  const isDraggingRef = useRef(false);

  // Sync from prop when not actively dragging.
  useEffect(() => {
    if (!isDraggingRef.current) {
      setLocalOffset(propOffset);
      localOffsetRef.current = propOffset;
    }
  }, [propOffset]);

  // Per-tile integer hour; updated via setValue (no spring) for zero lag.
  const [tilePositions] = useState(() =>
    Array.from({ length: n }, (_, i) =>
      new Animated.Value((i * interval + propOffset) % ringSize),
    ),
  );

  // Shared continuous drag delta in hours, in (-0.5, 0.5]. Adds on top of each
  // tile's integer hour so the wheel slides smoothly between haptic ticks.
  const dragFractionAnim = useRef(new Animated.Value(0)).current;

  const lastDeltaRef = useRef(0);
  const scaleWRef = useRef(0);
  const onChangeRef = useRef(onChange);
  const onCommitRef = useRef(onCommit);
  const onLongPressRef = useRef(onLongPress);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didLongPressRef = useRef(false);

  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);
  useEffect(() => { onCommitRef.current = onCommit; }, [onCommit]);
  useEffect(() => { onLongPressRef.current = onLongPress; }, [onLongPress]);

  // Sync tile hours when localOffset changes (handles external prop updates;
  // during a drag we also update inline below for atomic step timing).
  useEffect(() => {
    tilePositions.forEach((anim, i) => {
      const newHour = (i * interval + localOffset) % ringSize;
      anim.setValue(newHour);
    });
  }, [localOffset, tilePositions, ringSize, interval]);

  const leftAnims = useMemo(
    () =>
      tilePositions.map((anim) =>
        Animated.add(anim, dragFractionAnim).interpolate({
          inputRange: [0, ringSize],
          outputRange: ['0%', '100%'],
          extrapolate: 'extend',
        }),
      ),
    [tilePositions, dragFractionAnim, ringSize],
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 5,
        onPanResponderGrant: () => {
          lastDeltaRef.current = 0;
          didLongPressRef.current = false;
          isDraggingRef.current = true;
          dragFractionAnim.setValue(0);
          if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
          longPressTimerRef.current = setTimeout(() => {
            didLongPressRef.current = true;
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
            onLongPressRef.current?.();
            longPressTimerRef.current = null;
          }, longPressMs);
        },
        onPanResponderMove: (_, g) => {
          const scaleW = scaleWRef.current;
          if (scaleW === 0) return;
          if (Math.abs(g.dx) > 5 || Math.abs(g.dy) > 5) {
            if (longPressTimerRef.current) {
              clearTimeout(longPressTimerRef.current);
              longPressTimerRef.current = null;
            }
          }
          if (didLongPressRef.current) return;

          const dragHours = (g.dx * ringSize) / scaleW;
          const delta = Math.round(dragHours);
          const fractional = dragHours - delta;

          if (delta !== lastDeltaRef.current) {
            const step = delta - lastDeltaRef.current;
            lastDeltaRef.current = delta;
            Haptics.selectionAsync();
            const newOffset =
              (((localOffsetRef.current + step) % ringSize) + ringSize) % ringSize;
            localOffsetRef.current = newOffset;
            tilePositions.forEach((anim, i) => {
              const newHour = (i * interval + newOffset) % ringSize;
              anim.setValue(newHour);
            });
            setLocalOffset(newOffset);
            onChangeRef.current?.(newOffset);
          }
          dragFractionAnim.setValue(fractional);
        },
        onPanResponderRelease: () => {
          if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
          }
          dragFractionAnim.setValue(0);
          isDraggingRef.current = false;
          if (!didLongPressRef.current) {
            onCommitRef.current?.(localOffsetRef.current);
          }
        },
      }),
    [ringSize, interval, n, tilePositions, dragFractionAnim, longPressMs],
  );

  return (
    <View style={[s.root, style]} {...panResponder.panHandlers}>
      <View
        style={s.scaleArea}
        onLayout={(e) => {
          scaleWRef.current = e.nativeEvent.layout.width;
        }}
      >
        <View style={s.ticks}>
          {Array.from({ length: ringSize }, (_, i) => (
            <View key={i} style={s.tickSlot}>
              <View style={[s.tick, tickStyle]} />
            </View>
          ))}
        </View>
        {leftAnims.map((leftAnim, i) => {
          const hour = (i * interval + localOffset) % ringSize;
          const label = formatLabel(hour);
          if (renderTile) {
            return (
              <Animated.View
                key={i}
                style={[
                  s.tilePosition,
                  { left: leftAnim, transform: [{ translateX: -TILE_WIDTH / 2 }] },
                ]}
              >
                {renderTile({ hour, index: i, label })}
              </Animated.View>
            );
          }
          return (
            <AnimatedGlassView
              key={i}
              glassEffectStyle="clear"
              colorScheme="dark"
              style={[
                s.glass,
                tileStyle,
                { left: leftAnim, transform: [{ translateX: -TILE_WIDTH / 2 }] },
              ]}
            >
              <Text style={[s.hour, tileTextStyle]}>{label}</Text>
            </AnimatedGlassView>
          );
        })}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, position: 'relative' },
  scaleArea: { flex: 1, justifyContent: 'center', position: 'relative' },
  ticks: { flexDirection: 'row', alignItems: 'center' },
  tickSlot: { flex: 1, alignItems: 'center' },
  tick: { width: 1, height: 28, backgroundColor: 'rgba(255,255,255,0.5)' },
  tilePosition: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: TILE_WIDTH,
  },
  glass: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: TILE_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderRadius: 10,
  },
  hour: { color: '#fff', fontSize: 22, fontWeight: '600' },
});
