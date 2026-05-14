import { useEffect } from 'react';
import { LayoutAnimation, StyleSheet, UIManager, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { LAYOUT } from './config';
import { DotGrid } from './components/DotGrid';
import { Iterator } from './components/Iterator';
import { MedTile } from './components/MedTile';
import { resetAndSeed, useMedsRepository } from './lib/medsCollection';
import { useClock } from './lib/useClock';
import { useExpansion } from './lib/useExpansion';

if (UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function App() {
  const { meds, setOffset } = useMedsRepository();
  const now = useClock(60_000);
  const expansion = useExpansion({
    mode: 'single',
    beforeChange: () =>
      LayoutAnimation.configureNext({
        duration: 240,
        update: { type: 'easeInEaseOut' },
      }),
  });

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
            {(med, { itemStyle }) => (
              <MedTile
                med={med}
                offset={med.offset}
                setOffset={(v) => setOffset(med.id, v)}
                expanded={expansion.isExpanded(med.id)}
                onToggle={() => expansion.toggle(med.id)}
                style={itemStyle}
                now={now}
              />
            )}
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
