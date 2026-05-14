import { useMemo, type ReactNode } from 'react';
import {
  Animated,
  StyleSheet,
  View,
  type GestureResponderHandlers,
  type ViewStyle,
} from 'react-native';

const DEFAULT_TILE_WIDTH = 44;

export type WheelTileInfo = {
  index: number;
};

export type WheelProps = {
  /** Total positions on the ring (count of ticks rendered). */
  ringSize: number;
  /** Per-tile Animated.Value holding the integer hour. Length = number of tiles. */
  tilePositions: Animated.Value[];
  /** Shared continuous drag-fraction Animated.Value, added to each tile's position. */
  dragFractionAnim: Animated.Value;
  /** Pan responder handlers (from useWheelDrag) to spread on the gesture root. */
  panHandlers: GestureResponderHandlers;
  /** Called once on layout with the rendered scale-area width in pixels. */
  onScaleLayout: (width: number) => void;
  /** Render function for each tile. */
  renderTile: (info: WheelTileInfo) => ReactNode;

  /** Visual overrides. */
  style?: ViewStyle;
  tickStyle?: ViewStyle;
  /** Pixel width of each tile; the rendered Animated.View is sized to this. Default 44. */
  tileWidth?: number;
};

/**
 * Pure visual layer: renders `ringSize` evenly-spaced ticks and `tilePositions.length`
 * tiles positioned via `Animated.add(tilePosition, dragFractionAnim)`. Has no
 * gesture, no state, no haptics — wire those in via the `panHandlers` /
 * `onScaleLayout` / `tilePositions` / `dragFractionAnim` props (typically by
 * spreading the return value of `useWheelDrag`).
 */
export function Wheel({
  ringSize,
  tilePositions,
  dragFractionAnim,
  panHandlers,
  onScaleLayout,
  renderTile,
  style,
  tickStyle,
  tileWidth = DEFAULT_TILE_WIDTH,
}: WheelProps) {
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

  return (
    <View style={[s.root, style]} {...panHandlers}>
      <View
        style={s.scaleArea}
        onLayout={(e) => onScaleLayout(e.nativeEvent.layout.width)}
      >
        <View style={s.ticks}>
          {Array.from({ length: ringSize }, (_, i) => (
            <View key={i} style={s.tickSlot}>
              <View style={[s.tick, tickStyle]} />
            </View>
          ))}
        </View>
        {leftAnims.map((leftAnim, i) => (
          <Animated.View
            key={i}
            style={[
              s.tilePosition,
              {
                width: tileWidth,
                left: leftAnim,
                transform: [{ translateX: -tileWidth / 2 }],
              },
            ]}
          >
            {renderTile({ index: i })}
          </Animated.View>
        ))}
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
  },
});
