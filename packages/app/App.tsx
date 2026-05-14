import { useEffect, useRef, useState } from 'react';
import {
  LayoutAnimation,
  StyleSheet,
  UIManager,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { GRID_STRATEGY, MEDS } from './data';
import { DotGrid } from './components/DotGrid';
import { MedTile } from './components/MedTile';
import { compressedTileStyle } from './lib/layout';
import { loadOffsets, saveOffsets } from './lib/storage';

if (UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function App() {
  const { width: screenWidth } = useWindowDimensions();
  const [offsets, setOffsets] = useState<number[]>(() => MEDS.map(() => 0));
  const [expandedIndex, setExpandedIndex] = useState<number>(-1);
  const [nowTick, setNowTick] = useState<number>(Date.now());
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    loadOffsets().then((loaded) => {
      if (loaded && loaded.length === MEDS.length) setOffsets(loaded);
    });
  }, []);

  useEffect(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveOffsets(offsets);
    }, 500);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [offsets]);

  useEffect(() => {
    const id = setInterval(() => setNowTick(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  const setOffsetFor = (i: number, v: number) => {
    setOffsets((cur) => {
      if (cur[i] === v) return cur;
      const next = [...cur];
      next[i] = v;
      return next;
    });
  };

  const toggleExpanded = (i: number) => {
    LayoutAnimation.configureNext({
      duration: 240,
      update: { type: 'easeInEaseOut' },
    });
    setExpandedIndex((cur) => (cur === i ? -1 : i));
  };

  const rootPadding = 16;
  const gap = 10;
  const compressed = compressedTileStyle(
    GRID_STRATEGY,
    screenWidth,
    MEDS.length,
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
            {MEDS.map((med, i) => (
              <MedTile
                key={i}
                med={med}
                offset={offsets[i] ?? 0}
                setOffset={(v) => setOffsetFor(i, v)}
                expanded={expandedIndex === i}
                onToggle={() => toggleExpanded(i)}
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
