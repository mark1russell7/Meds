import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, PanResponder, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
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
    <SafeAreaProvider>
      <SafeAreaView style={s.root}>
        <StatusBar style="light" />
        {MEDS.map((med, i) => (
          <MedRow key={i} med={med} />
        ))}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

function MedRow({ med }: { med: Med }) {
  const mode12 = 12 % med.interval === 0;
  const ringSize = mode12 ? 12 : 24;
  const n = mode12 ? 12 / med.interval : 24 / med.interval;
  const [offset, setOffset] = useState(0);
  const visualV = useRef(new Animated.Value(0)).current;
  const visualVRef = useRef(0);
  const lastDeltaRef = useRef(0);
  const grantVisualVRef = useRef(0);
  const scaleWRef = useRef(0);

  useEffect(() => {
    const id = visualV.addListener(({ value }) => {
      visualVRef.current = value;
    });
    return () => visualV.removeListener(id);
  }, [visualV]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 5,
        onPanResponderGrant: () => {
          lastDeltaRef.current = 0;
          grantVisualVRef.current = visualVRef.current;
          visualV.stopAnimation();
        },
        onPanResponderMove: (_, g) => {
          const scaleW = scaleWRef.current;
          if (scaleW === 0) return;
          const dragHours = (g.dx * ringSize) / scaleW;
          visualV.setValue(grantVisualVRef.current + dragHours);

          const delta = Math.round(dragHours);
          if (delta !== lastDeltaRef.current) {
            const step = delta - lastDeltaRef.current;
            lastDeltaRef.current = delta;
            Haptics.selectionAsync();
            setOffset((cur) => (((cur + step) % ringSize) + ringSize) % ringSize);
          }
        },
        onPanResponderRelease: () => {
          const target = grantVisualVRef.current + lastDeltaRef.current;
          Animated.spring(visualV, {
            toValue: target,
            useNativeDriver: false,
            speed: 28,
            bounciness: 4,
          }).start(({ finished }) => {
            if (finished) {
              const wrapped = (((target % ringSize) + ringSize) % ringSize);
              visualV.setValue(wrapped);
            }
          });
        },
      }),
    [ringSize, visualV],
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
        {[-1, 0, 1].map((m) =>
          Array.from({ length: n }, (_, i) => {
            const shifted = Animated.add(visualV, i * med.interval + m * ringSize);
            const leftAnim = shifted.interpolate({
              inputRange: [0, ringSize],
              outputRange: ['0%', '100%'],
              extrapolate: 'extend',
            });
            const hour = (i * med.interval + offset) % ringSize;
            return (
              <AnimatedGlassView
                key={`${m}-${i}`}
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
          }),
        )}
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
