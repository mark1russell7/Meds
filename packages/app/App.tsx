import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, PanResponder, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { GlassView } from 'expo-glass-effect';
import * as Haptics from 'expo-haptics';

const AnimatedGlassView = Animated.createAnimatedComponent(GlassView);

type Med = { name: string; interval: number };

const MEDS: Med[] = [
  { name: 'ipratropium bromide', interval: 12 },
  { name: 'benzonatate', interval: 8 },
  { name: 'acetaminophen', interval: 6 },
  { name: 'albuterol sulfate', interval: 4 },
  { name: 'flonase', interval: 24 },
  { name: 'allegra', interval: 24 },
];

const formatHour = (h: number, mode12: boolean): string => {
  if (mode12) return h === 0 ? '12' : String(h);
  if (h === 0) return '12a';
  if (h < 12) return `${h}a`;
  if (h === 12) return '12p';
  return `${h - 12}p`;
};

export default function App() {
  return (
    <SafeAreaView style={s.root}>
      <StatusBar style="light" />
      {MEDS.map((med, i) => (
        <MedRow key={i} med={med} />
      ))}
    </SafeAreaView>
  );
}

function MedRow({ med }: { med: Med }) {
  const mode12 = 12 % med.interval === 0;
  const ringSize = mode12 ? 12 : 24;
  const n = mode12 ? 12 / med.interval : 24 / med.interval;
  const [offset, setOffset] = useState(0);
  const lastDeltaRef = useRef(0);
  const prevOffsetRef = useRef(0);
  const scaleWRef = useRef(0);

  const [tilePositions] = useState(() =>
    Array.from({ length: n }, (_, i) => new Animated.Value((i * med.interval) % ringSize)),
  );

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
          speed: 28,
          bounciness: 4,
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
        },
        onPanResponderMove: (_, g) => {
          const scaleW = scaleWRef.current;
          if (scaleW === 0) return;
          const delta = Math.round((g.dx * ringSize) / scaleW);
          if (delta !== lastDeltaRef.current) {
            const step = delta - lastDeltaRef.current;
            lastDeltaRef.current = delta;
            Haptics.selectionAsync();
            setOffset((cur) => (((cur + step) % ringSize) + ringSize) % ringSize);
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
  root: { flex: 1, padding: 16, gap: 10, backgroundColor: '#1C1C1E' },
  row: {
    flex: 1,
    backgroundColor: '#2C2C2E',
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
