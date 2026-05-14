import { Pressable, StyleSheet, Text, View } from 'react-native';
import { GlassView } from 'expo-glass-effect';
import type { MedTileProps } from '../types';
import { formatClockHour, nextDose } from '../lib/schedule';

export function CompressedMedTile({ med, offset, onToggle, now }: MedTileProps) {
  const next = nextDose(med, offset, now);
  return (
    <Pressable onLongPress={onToggle} delayLongPress={400} style={s.fill}>
      <GlassView glassEffectStyle="clear" colorScheme="dark" style={s.glass}>
        <Text style={s.name} numberOfLines={2}>{med.name}</Text>
        <Text style={s.interval}>{med.interval}h</Text>
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

const s = StyleSheet.create({
  fill: { flex: 1 },
  glass: {
    flex: 1,
    padding: 12,
    borderRadius: 14,
    overflow: 'hidden',
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
  },
  name: { color: '#fff', fontSize: 13, fontWeight: '600' },
  interval: { color: 'rgba(255,255,255,0.55)', fontSize: 11, marginTop: 2 },
  spacer: { flex: 1 },
  nextLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 10,
    letterSpacing: 1,
    marginBottom: 2,
  },
  nextTime: { color: '#fff', fontSize: 26, fontWeight: '700' },
});
