import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, PanResponder, StyleSheet, Text, View } from 'react-native';
import { GlassView } from 'expo-glass-effect';
import * as Haptics from 'expo-haptics';
import type { MedTileProps } from '../data';
import { formatHour } from '../lib/schedule';

const AnimatedGlassView = Animated.createAnimatedComponent(GlassView);

export function ExpandedMedTile({ med, offset, setOffset, onToggle }: MedTileProps) {
  const mode12 = 12 % med.interval === 0;
  const ringSize = mode12 ? 12 : 24;
  const n = mode12 ? 12 / med.interval : 24 / med.interval;

  const [tilePositions] = useState(() =>
    Array.from({ length: n }, (_, i) =>
      new Animated.Value((i * med.interval + offset) % ringSize),
    ),
  );

  const prevOffsetRef = useRef(offset);
  const lastDeltaRef = useRef(0);
  const scaleWRef = useRef(0);
  const offsetRef = useRef(offset);
  const setOffsetRef = useRef(setOffset);
  const onToggleRef = useRef(onToggle);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didLongPressRef = useRef(false);

  useEffect(() => { offsetRef.current = offset; }, [offset]);
  useEffect(() => { setOffsetRef.current = setOffset; }, [setOffset]);
  useEffect(() => { onToggleRef.current = onToggle; }, [onToggle]);

  useEffect(() => {
    const prev = prevOffsetRef.current;
    tilePositions.forEach((anim, i) => {
      const prevHour = (i * med.interval + prev) % ringSize;
      const newHour = (i * med.interval + offset) % ringSize;
      const wraps = Math.abs(newHour - prevHour) > ringSize / 2;
      if (wraps) {
        anim.setValue(newHour);
      } else {
        Animated.spring(anim, {
          toValue: newHour,
          useNativeDriver: false,
          speed: 50,
          bounciness: 0,
        }).start();
      }
    });
    prevOffsetRef.current = offset;
  }, [offset, tilePositions, ringSize, med.interval]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 5,
        onPanResponderGrant: () => {
          lastDeltaRef.current = 0;
          didLongPressRef.current = false;
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

          const delta = Math.round((g.dx * ringSize) / scaleW);
          if (delta !== lastDeltaRef.current) {
            const step = delta - lastDeltaRef.current;
            lastDeltaRef.current = delta;
            Haptics.selectionAsync();
            const newOffset =
              (((offsetRef.current + step) % ringSize) + ringSize) % ringSize;
            setOffsetRef.current(newOffset);
          }
        },
        onPanResponderRelease: () => {
          if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
          }
        },
      }),
    [ringSize],
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
        {tilePositions.map((anim, i) => {
          const leftAnim = anim.interpolate({
            inputRange: [0, ringSize],
            outputRange: ['0%', '100%'],
          });
          const hour = (i * med.interval + offset) % ringSize;
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
