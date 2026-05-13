import { useMemo, useRef, useState } from 'react';
import { PanResponder, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';

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
      <StatusBar style="auto" />
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

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 5,
        onPanResponderGrant: () => {
          lastDeltaRef.current = 0;
        },
        onPanResponderMove: (_, g) => {
          const delta = Math.round(g.dx / 25);
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
      <View style={s.nameWrap}>
        <Text style={s.name}>{med.name}--{med.interval}h</Text>
      </View>
      <View style={s.tiles}>
        {Array.from({ length: n }, (_, i) => (
          <View key={i} style={s.tile}>
            <Text style={s.hour}>{formatHour((i * med.interval + offset) % ringSize, mode12)}</Text>
          </View>
        ))}
      </View>
      <View style={s.ticks}>
        {Array.from({ length: ringSize }, (_, i) => {
          const isMajor =
            (((i - offset) % med.interval) + med.interval) % med.interval === 0;
          return <View key={i} style={[s.tick, isMajor && s.tickMajor]} />;
        })}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, padding: 8, gap: 8 },
  row: { flex: 1 },
  nameWrap: { flex: 1, justifyContent: 'center' },
  name: { fontSize: 14 },
  tiles: { flex: 4, flexDirection: 'row', gap: 4 },
  tile: { flex: 1, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  hour: { fontSize: 22 },
  ticks: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 4 },
  tick: { width: 1, height: 4, backgroundColor: '#bbb' },
  tickMajor: { width: 2, height: 8, backgroundColor: '#000' },
});
