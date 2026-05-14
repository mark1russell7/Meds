import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, PanResponder, StyleSheet, Text, View } from 'react-native';
import { GlassView } from 'expo-glass-effect';
import * as Haptics from 'expo-haptics';
import type { MedTileProps } from '../data';
import { formatHour } from '../lib/schedule';

const AnimatedGlassView = Animated.createAnimatedComponent(GlassView);

export function ExpandedMedTile({
  med,
  offset: propOffset,
  setOffset: propSetOffset,
  onToggle,
}: MedTileProps) {
  const mode12 = 12 % med.interval === 0;
  const ringSize = mode12 ? 12 : 24;
  const n = mode12 ? 12 / med.interval : 24 / med.interval;

  // Local offset for fast in-component updates during drag. Avoids the
  // SignalDB round-trip (updateOne -> emit -> App refetch -> App re-render
  // -> all MedTiles re-render) on every haptic tick. We only commit to the
  // parent once on release.
  const [localOffset, setLocalOffset] = useState(propOffset);
  const localOffsetRef = useRef(propOffset);
  const isDraggingRef = useRef(false);

  useEffect(() => {
    // Only sync the local state from the prop when we're not mid-drag.
    if (!isDraggingRef.current) {
      setLocalOffset(propOffset);
      localOffsetRef.current = propOffset;
    }
  }, [propOffset]);

  // Per-tile hour (integer), updated via setValue.
  const [tilePositions] = useState(() =>
    Array.from({ length: n }, (_, i) =>
      new Animated.Value((i * med.interval + propOffset) % ringSize),
    ),
  );

  // Shared continuous drag delta in hours, in (-0.5, 0.5]. Added on top of
  // each tile's integer hour so the wheel slides smoothly between haptic ticks.
  const dragFractionAnim = useRef(new Animated.Value(0)).current;

  const lastDeltaRef = useRef(0);
  const scaleWRef = useRef(0);
  const propSetOffsetRef = useRef(propSetOffset);
  const onToggleRef = useRef(onToggle);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didLongPressRef = useRef(false);

  useEffect(() => { propSetOffsetRef.current = propSetOffset; }, [propSetOffset]);
  useEffect(() => { onToggleRef.current = onToggle; }, [onToggle]);

  // Keep tile hours in sync with local offset (catches external prop changes
  // that the useEffect above synced into localOffset).
  useEffect(() => {
    tilePositions.forEach((anim, i) => {
      const newHour = (i * med.interval + localOffset) % ringSize;
      anim.setValue(newHour);
    });
  }, [localOffset, tilePositions, ringSize, med.interval]);

  // Stable per-tile interpolated left positions. Without useMemo we'd create
  // a new pair of Animated nodes per render, forcing the native side to
  // re-subscribe each frame.
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
            onToggleRef.current();
            longPressTimerRef.current = null;
          }, 500);
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
            // Update tile hours atomically with the fraction flip so the
            // visual is continuous across the crossing.
            tilePositions.forEach((anim, i) => {
              const newHour = (i * med.interval + newOffset) % ringSize;
              anim.setValue(newHour);
            });
            // Update the React state (only this component re-renders).
            setLocalOffset(newOffset);
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
          // Commit the final offset to the parent / SignalDB once per gesture.
          propSetOffsetRef.current(localOffsetRef.current);
        },
      }),
    [ringSize, n, med.interval, tilePositions, dragFractionAnim],
  );

  return (
    <View style={s.row} {...panResponder.panHandlers}>
      <Text style={s.name}>{med.name}--{med.interval}h</Text>
      <View
        style={s.scaleArea}
        onLayout={(e) => {
          scaleWRef.current = e.nativeEvent.layout.width;
        }}
      >
        <View style={s.ticks}>
          {Array.from({ length: ringSize }, (_, i) => (
            <View key={i} style={s.tickSlot}>
              <View style={s.tick} />
            </View>
          ))}
        </View>
        {leftAnims.map((leftAnim, i) => {
          const hour = (i * med.interval + localOffset) % ringSize;
          return (
            <AnimatedGlassView
              key={i}
              glassEffectStyle="clear"
              colorScheme="dark"
              style={[
                s.glass,
                { left: leftAnim, transform: [{ translateX: -22 }] },
              ]}
            >
              <Text style={s.hour}>{formatHour(hour, mode12)}</Text>
            </AnimatedGlassView>
          );
        })}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  row: {
    flex: 1,
    backgroundColor: 'rgba(44,44,46,0.92)',
    borderRadius: 14,
    paddingHorizontal: 22,
    paddingVertical: 10,
    overflow: 'hidden',
  },
  name: { color: 'rgba(255,255,255,0.6)', fontSize: 12, marginBottom: 4 },
  scaleArea: { flex: 1, justifyContent: 'center', position: 'relative' },
  ticks: { flexDirection: 'row', alignItems: 'center' },
  tickSlot: { flex: 1, alignItems: 'center' },
  tick: { width: 1, height: 28, backgroundColor: 'rgba(255,255,255,0.5)' },
  glass: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderRadius: 10,
  },
  hour: { color: '#fff', fontSize: 22, fontWeight: '600' },
});
