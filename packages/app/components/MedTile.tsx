import { StyleSheet, View, type ViewStyle } from 'react-native';
import type { MedTileProps } from '../data';
import { CompressedMedTile } from './CompressedMedTile';
import { ExpandedMedTile } from './ExpandedMedTile';

export function MedTile(props: MedTileProps) {
  const containerStyle: ViewStyle = props.expanded ? s.expandedOuter : props.compressedStyle;
  return (
    <View style={containerStyle}>
      {props.expanded ? <ExpandedMedTile {...props} /> : <CompressedMedTile {...props} />}
    </View>
  );
}

const s = StyleSheet.create({
  expandedOuter: {
    width: '100%',
    height: 160,
  },
});
