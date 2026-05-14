import { useEffect, useMemo } from 'react';
import { StyleSheet, UIManager, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { LAYOUT } from './config';
import { DotGrid } from './components/DotGrid';
import { Iterator } from './components/Iterator';
import { MedTile } from './components/MedTile';
import { resetAndSeed, useMedsRepository } from './lib/medsCollection';
import { useClock } from './lib/useClock';
import { useMedRegistry } from './lib/useMedRegistry';

if (UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function App() {
  const { meds, setOffset } = useMedsRepository();
  const now = useClock(60_000);

  const medIds = useMemo(() => meds.map((m) => m.id), [meds]);
  const registry = useMedRegistry(medIds);

  useEffect(() => {
    resetAndSeed();
  }, []);

  return (
    <SafeAreaProvider>
      <View style={s.root}>
        <DotGrid />
        <SafeAreaView style={s.safeArea}>
          <StatusBar style="light" />
          <Iterator items={meds} layout={LAYOUT} keyExtractor={(m) => m.id}>
            {(med, { itemStyle }) => {
              const actor = registry.getActor(med.id);
              if (!actor) return null;
              return (
                <MedTile
                  actor={actor}
                  med={med}
                  offset={med.offset}
                  setOffset={(v) => setOffset(med.id, v)}
                  style={itemStyle}
                  now={now}
                />
              );
            }}
          </Iterator>
        </SafeAreaView>
      </View>
    </SafeAreaProvider>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#1C1C1E' },
  safeArea: { flex: 1 },
});
