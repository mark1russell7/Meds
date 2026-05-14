import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  LayoutAnimation,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  UIManager,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { GlassView } from 'expo-glass-effect';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AnimatedGlassView = Animated.createAnimatedComponent(GlassView);

// === Config: cycle through these to compare layouts ===
type GridStrategy = 'two-cols' | 'three-cols' | 'auto-square';
const GRID_STRATEGY: GridStrategy = 'two-cols';

const STORAGE_KEY_OFFSETS = '@meds/offsets';

// === Data ===
type Med = { name: string; interval: number };

const MEDS: Med[] = [
  { name: 'ipratropium bromide', interval: 12 },
  { name: 'benzonatate', interval: 8 },
  { name: 'acetaminophen', interval: 6 },
  { name: 'albuterol sulfate', interval: 4 },
  { name: 'flonase', interval: 24 },
  { name: 'allegra', interval: 24 },
];

// === Hour formatting ===
const formatHour = (h: number, mode12: boolean): string => {
  if (mode12) return h === 0 ? '12' : String(h);
  if (h === 0) return '12a';
  if (h < 12) return `${h}a`;
  if (h === 12) return '12p';
  return `${h - 12}p`;
};

const formatClockHour = (h: number): string => {
  if (h === 0) return '12a';
  if (h < 12) return `${h}a`;
  if (h === 12) return '12p';
  return `${h - 12}p`;
};

// === Dose schedule helpers ===
function dosesInDay(med: Med, offset: number): number[] {
  const mode12 = 12 % med.interval === 0;
  const ringSize = mode12 ? 12 : 24;
  const n = ringSize / med.interval;
  const set = new Set<number>();
  for (let i = 0; i < n; i++) {
    const h = (i * med.interval + offset) % ringSize;
    if (mode12) {
      set.add(h);
      set.add((h + 12) % 24);
    } else {
      set.add(h);
    }
  }
  return [...set].sort((a, b) => a - b);
}

function nextDose(med: Med, offset: number, now: Date): { hour: number; tomorrow: boolean } {
  const doses = dosesInDay(med, offset);
  if (doses.length === 0) return { hour: 0, tomorrow: false };
  const hourNow = now.getHours() + now.getMinutes() / 60;
  const upcoming = doses.find((h) => h > hourNow);
  return upcoming !== undefined
    ? { hour: upcoming, tomorrow: false }
    : { hour: doses[0], tomorrow: true };
}

// === Grid layout strategies ===
function compressedTileStyle(
  strategy: GridStrategy,
  screenWidth: number,
  count: number,
  gap: number,
  rootPadding: number,
): { width: number; aspectRatio: number } {
  const available = screenWidth - rootPadding * 2;
  let cols: number;
  if (strategy === 'two-cols') cols = 2;
  else if (strategy === 'three-cols') cols = 3;
  else cols = Math.max(2, Math.ceil(Math.sqrt(count)));
  const width = (available - gap * (cols - 1)) / cols;
  return { width, aspectRatio: 1 };
}

if (UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// === DotGrid background ===
function DotGrid() {
  const { width, height } = useWindowDimensions();
  const dots = useMemo(() => {
    const spacing = 22;
    const arr: { id: number; x: number; y: number }[] = [];
    const cols = Math.ceil(width / spacing) + 1;
    const rows = Math.ceil(height / spacing) + 1;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        arr.push({ id: r * cols + c, x: c * spacing, y: r * spacing });
      }
    }
    return arr;
  }, [width, height]);

  return (
    <View style={dotS.container} pointerEvents="none">
      {dots.map((d) => (
        <View key={d.id} style={[dotS.dot, { left: d.x, top: d.y }]} />
      ))}
    </View>
  );
}

const dotS = StyleSheet.create({
  container: { ...StyleSheet.absoluteFillObject },
  dot: {
    position: 'absolute',
    width: 2,
    height: 2,
    borderRadius: 1,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
});

// === Storage ===
async function loadOffsets(): Promise<number[] | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY_OFFSETS);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.every((v) => typeof v === 'number')) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

async function saveOffsets(offsets: number[]) {
  try {
    await AsyncStorage.setItem(STORAGE_KEY_OFFSETS, JSON.stringify(offsets));
  } catch {}
}

// === App ===
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
      duration: 260,
      create: { type: 'easeInEaseOut', property: 'opacity' },
      update: { type: 'easeInEaseOut' },
      delete: { type: 'easeInEaseOut', property: 'opacity' },
    });
    setExpandedIndex((cur) => (cur === i ? -1 : i));
  };

  const rootPadding = 16;
  const gap = 10;
  const compressed = compressedTileStyle(GRID_STRATEGY, screenWidth, MEDS.length, gap, rootPadding);
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

// === MedTile (dispatch) ===
type MedTileProps = {
  med: Med;
  offset: number;
  setOffset: (v: number) => void;
  expanded: boolean;
  onToggle: () => void;
  compressedStyle: { width: number; aspectRatio: number };
  now: Date;
};

function MedTile(props: MedTileProps) {
  if (props.expanded) return <ExpandedMedTile {...props} />;
  return <CompressedMedTile {...props} />;
}

// === CompressedMedTile ===
function CompressedMedTile({ med, offset, onToggle, compressedStyle, now }: MedTileProps) {
  const next = nextDose(med, offset, now);
  return (
    <Pressable onLongPress={onToggle} delayLongPress={400} style={compressedStyle}>
      <GlassView glassEffectStyle="clear" colorScheme="dark" style={s.compressedFill}>
        <Text style={s.tileName} numberOfLines={2}>{med.name}</Text>
        <Text style={s.tileInterval}>{med.interval}h</Text>
        <View style={s.spacer} />
        <Text style={s.nextLabel}>next</Text>
        <Text style={s.nextTime}>
          {formatClockHour(next.hour)}
          {next.tomorrow ? '+' : ''}
        </Text>
      </GlassView>
    </Pressable>
  );
}

// === ExpandedMedTile (the wheel + hold-to-collapse) ===
function ExpandedMedTile({ med, offset, setOffset, onToggle }: MedTileProps) {
  const mode12 = 12 % med.interval === 0;
  const ringSize = mode12 ? 12 : 24;
  const n = mode12 ? 12 / med.interval : 24 / med.interval;

  const visualV = useRef(new Animated.Value(offset)).current;
  const visualVRef = useRef(offset);
  const lastDeltaRef = useRef(0);
  const grantVisualVRef = useRef(0);
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
          const dragHours = (g.dx * ringSize) / scaleW;
          visualV.setValue(grantVisualVRef.current + dragHours);
          const delta = Math.round(dragHours);
          if (delta !== lastDeltaRef.current) {
            const step = delta - lastDeltaRef.current;
            lastDeltaRef.current = delta;
            Haptics.selectionAsync();
            const newOffset = (((offsetRef.current + step) % ringSize) + ringSize) % ringSize;
            setOffsetRef.current(newOffset);
          }
        },
        onPanResponderRelease: () => {
          if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
          }
          if (didLongPressRef.current) return;
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
    <View style={s.expandedRow} {...panResponder.panHandlers}>
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
  root: { flex: 1, backgroundColor: '#1C1C1E' },
  safeArea: { flex: 1 },
  grid: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignContent: 'flex-start',
  },
  compressedFill: {
    flex: 1,
    padding: 12,
    borderRadius: 14,
    overflow: 'hidden',
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
  },
  tileName: { color: '#fff', fontSize: 13, fontWeight: '600' },
  tileInterval: { color: 'rgba(255,255,255,0.55)', fontSize: 11, marginTop: 2 },
  spacer: { flex: 1 },
  nextLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 10, letterSpacing: 1, marginBottom: 2 },
  nextTime: { color: '#fff', fontSize: 26, fontWeight: '700' },
  expandedRow: {
    width: '100%',
    height: 160,
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
