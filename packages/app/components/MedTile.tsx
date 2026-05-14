import { useCallback } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { useSelector } from '@xstate/react';
import type { Med, MedTileProps } from '../types';
import type { MedActorRef, MedMode } from '../lib/medMachine';
import { CompressedMedTile } from './CompressedMedTile';
import { ExpandedMedTile } from './ExpandedMedTile';
import { ViewSwitch } from './ViewSwitch';

export type MedTileSlotProps = {
  actor: MedActorRef;
  med: Med;
  offset: number;
  setOffset: (v: number) => void;
  style: ViewStyle;
  now: Date;
};

/**
 * Adapter between the per-med XState actor and the dumb leaf view components
 * (CompressedMedTile / ExpandedMedTile). Subscribes to the actor for its
 * current mode and dispatches via ViewSwitch.
 */
export function MedTile({ actor, ...rest }: MedTileSlotProps) {
  const mode = useSelector(actor, (s) => s.value as MedMode);
  const onToggle = useCallback(() => {
    actor.send({ type: 'TOGGLE' });
  }, [actor]);
  const expanded = mode === 'expanded';

  const childProps: MedTileProps = { ...rest, expanded, onToggle };

  return (
    <View style={expanded ? s.expandedOuter : rest.style}>
      <ViewSwitch
        mode={mode}
        views={{
          compressed: () => <CompressedMedTile {...childProps} />,
          expanded: () => <ExpandedMedTile {...childProps} />,
        }}
      />
    </View>
  );
}

const s = StyleSheet.create({
  expandedOuter: {
    width: '100%',
    height: 160,
  },
});
