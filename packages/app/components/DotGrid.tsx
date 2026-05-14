import { useMemo } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';

export function DotGrid() {
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
    <View style={s.container} pointerEvents="none">
      {dots.map((d) => (
        <View key={d.id} style={[s.dot, { left: d.x, top: d.y }]} />
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  container: { ...StyleSheet.absoluteFillObject },
  dot: {
    position: 'absolute',
    width: 2,
    height: 2,
    borderRadius: 1,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
});
