import { useEffect, useState } from 'react';
import {
  LayoutAnimation,
  StyleSheet,
  UIManager,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { GRID_STRATEGY, SEED_MEDS } from './data';
import { DotGrid } from './components/DotGrid';
import { MedTile } from './components/MedTile';
import { compressedTileStyle } from './lib/layout';
import { medsCollection, resetAndSeed } from './lib/db';
import { useReactivity } from './lib/reactivity';

if (UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function App() {
  const { width: screenWidth } = useWindowDimensions();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [nowTick, setNowTick] = useState<number>(Date.now());

  // Reactive subscription: re-runs only when the query result changes.
  const meds = useReactivity(() => medsCollection.find().fetch(), []);

  // One-shot seed on mount (testing default: wipe + re-seed every launch).
  useEffect(() => {
    resetAndSeed();
  }, []);

  useEffect(() => {
    const id = setInterval(() => setNowTick(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  const setOffsetFor = (id: string, v: number) => {
    medsCollection.updateOne({ id }, { $set: { offset: v } });
  };

  const toggleExpanded = (id: string) => {
    LayoutAnimation.configureNext({
      duration: 240,
      update: { type: 'easeInEaseOut' },
    });
    setExpandedId((cur) => (cur === id ? null : id));
  };

  const rootPadding = 16;
  const gap = 10;
  const compressed = compressedTileStyle(
    GRID_STRATEGY,
    screenWidth,
    meds.length || SEED_MEDS.length,
    gap,
    rootPadding,
  );
  const now = new Date(nowTick);

  return (
    <SafeAreaProvider>
      <View style={s.root}>
        <DotGrid />
        <SafeAreaView style={s.safeArea}>
          <StatusBar style="light" />
          <View style={[s.grid, { padding: rootPadding, gap }]}>
            {meds.map((med) => (
              <MedTile
                key={med.id}
                med={med}
                offset={med.offset}
                setOffset={(v) => setOffsetFor(med.id, v)}
                expanded={expandedId === med.id}
                onToggle={() => toggleExpanded(med.id)}
                compressedStyle={compressed}
                now={now}
              />
            ))}
          </View>
        </SafeAreaView>
      </View>
    </SafeAreaProvider>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#1C1C1E' },
  safeArea: { flex: 1 },
  grid: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignContent: 'flex-start',
  },
});
