import { StyleSheet, Text, View } from 'react-native';
import type { MedTileProps } from '../types';
import { formatHour } from '../lib/schedule';
import { HourWheel } from './HourWheel';

export function ExpandedMedTile({ med, offset, setOffset, onToggle }: MedTileProps) {
  const mode12 = 12 % med.interval === 0;
  const ringSize = mode12 ? 12 : 24;

  return (
    <View style={s.row}>
      <Text style={s.name}>{med.name}--{med.interval}h</Text>
      <HourWheel
        ringSize={ringSize}
        interval={med.interval}
        offset={offset}
        onCommit={setOffset}
        onLongPress={onToggle}
        formatLabel={(h) => formatHour(h, mode12)}
      />
    </View>
  );
}

const s = StyleSheet.create({
  row: {
    flex: 1,
    backgroundColor: 'rgba(44,44,46,0.92)',
    borderRadius: 14,
    paddingHorizontal: 22,
    paddingVertical: 10,
    overflow: 'hidden',
  },
  name: { color: 'rgba(255,255,255,0.6)', fontSize: 12, marginBottom: 4 },
});
