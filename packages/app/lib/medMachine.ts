import { setup, type ActorRefFrom } from 'xstate';

/**
 * Per-med state. Add states here (e.g. 'editing', 'info') and wire transitions
 * below — the rest of the app (ViewSwitch, registry) reacts via state.value.
 */
export type MedMode = 'compressed' | 'expanded';

export type MedEvent =
  | { type: 'TOGGLE' }
  | { type: 'EXPAND' }
  | { type: 'COLLAPSE' };

/**
 * XState v5 machine modeling a single medication tile's lifecycle. Each med
 * tile gets its own actor (one per med id), spawned and supervised by the
 * useMedRegistry hook.
 *
 * Cross-cutting rules ("only one expanded at a time") are NOT in this machine
 * — they live in the registry coordinator so this stays small and per-entity.
 */
export const medMachine = setup({
  types: {} as {
    context: { id: string };
    input: { id: string };
    events: MedEvent;
  },
}).createMachine({
  id: 'med',
  context: ({ input }) => ({ id: input.id }),
  initial: 'compressed',
  states: {
    compressed: {
      on: {
        TOGGLE: 'expanded',
        EXPAND: 'expanded',
      },
    },
    expanded: {
      on: {
        TOGGLE: 'compressed',
        COLLAPSE: 'compressed',
      },
    },
  },
});

export type MedActorRef = ActorRefFrom<typeof medMachine>;
