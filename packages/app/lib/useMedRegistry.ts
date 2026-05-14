import { useEffect, useRef } from 'react';
import { LayoutAnimation } from 'react-native';
import { createActor } from 'xstate';
import { medMachine, type MedActorRef } from './medMachine';
import { useConstrainedSet } from './useConstrainedSet';

export type MedRegistryApi = {
  getActor: (id: string) => MedActorRef | undefined;
};

/**
 * Coordinator: spawns one MedActor per medication id, enforces the cross-med
 * "at most one expanded at a time" rule via a useConstrainedSet (dogfooded),
 * and wires LayoutAnimation so expansion transitions animate smoothly.
 *
 * The per-med state machine (medMachine) knows nothing about other meds; this
 * hook holds the only place that cares about cross-actor coordination.
 */
export function useMedRegistry(ids: string[]): MedRegistryApi {
  // The cross-med constraint as a constrained set. `beforeChange` fires
  // synchronously inside the setState updater, ahead of the next React render,
  // which is when LayoutAnimation.configureNext needs to land.
  const expanded = useConstrainedSet<string>({
    constraint: 'at-most-one',
    beforeChange: () =>
      LayoutAnimation.configureNext({
        duration: 240,
        update: { type: 'easeInEaseOut' },
      }),
  });

  // Refs so actor subscriptions (set up once) always see the latest mutators.
  const addExpandedRef = useRef(expanded.add);
  useEffect(() => {
    addExpandedRef.current = expanded.add;
  });
  const removeExpandedRef = useRef(expanded.remove);
  useEffect(() => {
    removeExpandedRef.current = expanded.remove;
  });

  const actorsRef = useRef(new Map<string, MedActorRef>());

  // Sync actor instances with the current id list.
  const idsKey = ids.join('|');
  useEffect(() => {
    const actors = actorsRef.current;
    const want = new Set(ids);

    // Stop + drop actors whose ids are no longer present.
    for (const [id, actor] of actors.entries()) {
      if (!want.has(id)) {
        actor.stop();
        actors.delete(id);
      }
    }

    // Spawn actors for newly-introduced ids.
    for (const id of ids) {
      if (actors.has(id)) continue;
      const actor = createActor(medMachine, { input: { id } });

      actor.subscribe((snapshot) => {
        if (snapshot.matches('expanded')) {
          // Synchronously collapse any other actor that's currently expanded.
          // Doing this in the subscriber (rather than via a separate useEffect
          // reacting to expanded.items changes) keeps both transitions inside
          // the same React batch, so LayoutAnimation animates them together.
          for (const [otherId, otherActor] of actors.entries()) {
            if (otherId !== id && otherActor.getSnapshot().matches('expanded')) {
              otherActor.send({ type: 'COLLAPSE' });
            }
          }
          addExpandedRef.current(id);
        } else {
          removeExpandedRef.current(id);
        }
      });
      actor.start();
      actors.set(id, actor);
    }
    // We intentionally depend on the stringified ids — same contents, same
    // identity, so we don't re-run the effect on every unrelated parent render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey]);

  // Stop all actors on unmount of the consumer.
  useEffect(() => {
    return () => {
      for (const actor of actorsRef.current.values()) {
        actor.stop();
      }
      actorsRef.current.clear();
    };
  }, []);

  return {
    getActor: (id) => actorsRef.current.get(id),
  };
}
