import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, PanResponder, type GestureResponderHandlers } from 'react-native';
import { useLongPress } from './useLongPress';

export type UseWheelDragOptions = {
  /** Total positions on the ring (e.g. 12 or 24 for hours). */
  ringSize: number;
  /** Positions between consecutive items. ringSize must be divisible by interval. */
  interval: number;
  /** Externally-controlled offset. Synced into the wheel when not actively dragging. */
  offset: number;
  /** Fires per integer crossing while dragging. */
  onChange?: (offset: number) => void;
  /** Fires once on release with the final offset (unless a long-press fired first). */
  onCommit?: (offset: number) => void;
  /** Fires once per integer crossing — typically wired to a haptic. */
  onTick?: () => void;
  /** Fires when the user holds without significant movement for `longPressMs`. */
  onLongPress?: () => void;
  /** Long-press duration in ms. Default 500. */
  longPressMs?: number;
};

export type WheelDragApi = {
  /** Spread onto the View that should receive touches. */
  panHandlers: GestureResponderHandlers;
  /** Per-item Animated.Value for current integer hour (length = ringSize / interval). */
  tilePositions: Animated.Value[];
  /** Shared Animated.Value carrying the continuous drag delta in (-0.5, 0.5]. */
  dragFractionAnim: Animated.Value;
  /** Call from onLayout of the scrollable area to register its width in px. */
  onScaleLayout: (width: number) => void;
  /** The committed local offset (integer in [0, ringSize)). Useful for rendering text. */
  currentOffset: number;
};

/**
 * All gesture + state for a ring slider. Returns props you spread onto a
 * <Wheel> (or any visual layer that knows how to draw N tiles positioned via
 * tilePositions + dragFractionAnim).
 *
 * Composition contract:
 *   onTick      — fires per integer crossing (parent wires to haptics.tick)
 *   onLongPress — fires on hold (parent wires to haptics.impact + UI action)
 */
export function useWheelDrag(opts: UseWheelDragOptions): WheelDragApi {
  const { ringSize, interval, offset, longPressMs = 500 } = opts;
  const n = ringSize / interval;

  // Local offset for fast in-component updates during drag; avoids round-trips
  // through any parent persistence (e.g. SignalDB) on every haptic tick.
  const [localOffset, setLocalOffset] = useState(offset);
  const localOffsetRef = useRef(offset);
  const isDraggingRef = useRef(false);

  // Sync from prop only when not actively dragging.
  useEffect(() => {
    if (!isDraggingRef.current) {
      setLocalOffset(offset);
      localOffsetRef.current = offset;
    }
  }, [offset]);

  // Per-tile integer hour, updated via setValue (no spring) for zero lag.
  const [tilePositions] = useState(() =>
    Array.from({ length: n }, (_, i) =>
      new Animated.Value((i * interval + offset) % ringSize),
    ),
  );

  // Shared continuous fraction added on top of each tile's integer hour for
  // smooth sliding between haptic ticks.
  const dragFractionAnim = useRef(new Animated.Value(0)).current;

  const lastDeltaRef = useRef(0);
  const scaleWRef = useRef(0);

  // Latest-callback refs so panResponder closure doesn't go stale.
  const onChangeRef = useRef(opts.onChange);
  const onCommitRef = useRef(opts.onCommit);
  const onTickRef = useRef(opts.onTick);
  useEffect(() => { onChangeRef.current = opts.onChange; }, [opts.onChange]);
  useEffect(() => { onCommitRef.current = opts.onCommit; }, [opts.onCommit]);
  useEffect(() => { onTickRef.current = opts.onTick; }, [opts.onTick]);

  const longPress = useLongPress({
    ms: longPressMs,
    onActivate: opts.onLongPress,
  });
  const longPressRef = useRef(longPress);
  useEffect(() => { longPressRef.current = longPress; }, [longPress]);

  // Sync tile hours when localOffset changes externally (e.g. after a release
  // when the parent committed via setOffset). During an active drag we also
  // update tilePositions inline below for atomic step + fraction-flip timing.
  useEffect(() => {
    tilePositions.forEach((anim, i) => {
      const newHour = (i * interval + localOffset) % ringSize;
      anim.setValue(newHour);
    });
  }, [localOffset, tilePositions, ringSize, interval]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 5,
        onPanResponderGrant: () => {
          lastDeltaRef.current = 0;
          isDraggingRef.current = true;
          dragFractionAnim.setValue(0);
          longPressRef.current.start();
        },
        onPanResponderMove: (_, g) => {
          longPressRef.current.reportMovement(g.dx, g.dy);
          const scaleW = scaleWRef.current;
          if (scaleW === 0) return;
          if (longPressRef.current.wasActivated()) return;

          const dragHours = (g.dx * ringSize) / scaleW;
          const delta = Math.round(dragHours);
          const fractional = dragHours - delta;

          if (delta !== lastDeltaRef.current) {
            const step = delta - lastDeltaRef.current;
            lastDeltaRef.current = delta;
            onTickRef.current?.();
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
          longPressRef.current.cancel();
          dragFractionAnim.setValue(0);
          isDraggingRef.current = false;
          if (!longPressRef.current.wasActivated()) {
            onCommitRef.current?.(localOffsetRef.current);
          }
        },
      }),
    [ringSize, interval, n, tilePositions, dragFractionAnim],
  );

  const onScaleLayout = useCallback((w: number) => {
    scaleWRef.current = w;
  }, []);

  return {
    panHandlers: panResponder.panHandlers,
    tilePositions,
    dragFractionAnim,
    onScaleLayout,
    currentOffset: localOffset,
  };
}
