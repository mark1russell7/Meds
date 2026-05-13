import { SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';

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
  const n = mode12 ? 12 / med.interval : 24 / med.interval;
  return (
    <View style={s.row}>
      <View style={s.nameWrap}>
        <Text style={s.name}>{med.name}--{med.interval}h</Text>
      </View>
      <View style={s.tiles}>
        {Array.from({ length: n }, (_, i) => (
          <View key={i} style={s.tile}>
            <Text style={s.hour}>{formatHour(i * med.interval, mode12)}</Text>
          </View>
        ))}
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
});
