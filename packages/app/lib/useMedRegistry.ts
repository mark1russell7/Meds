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
  const actorsRef = useRef(new Map<string, MedActorRef>());

  // The cross-med "at most one expanded" rule lives entirely in the
  // constrained set. The set is a mirror of actor state: actor subscribers
  // call add/remove to keep it in sync, and the constraint itself owns what
  // happens when an entry gets pushed out — `onEvict` reaches back into the
  // evicted actor and sends it COLLAPSE. `beforeChange` fires synchronously
  // inside the setState updater so LayoutAnimation.configureNext lands ahead
  // of the same render that commits both the expand and the collapse.
  const expanded = useConstrainedSet<string>({
    constraint: 'at-most-one',
    beforeChange: () =>
      LayoutAnimation.configureNext({
        duration: 240,
        update: { type: 'easeInEaseOut' },
      }),
    onEvict: (evicted, cause) => {
      // Only the constraint-driven case needs to push the actor — explicit
      // remove() calls come from actor subscribers reacting to the actor
      // already having collapsed on its own.
      if (cause !== 'constraint') return;
      for (const id of evicted) {
        actorsRef.current.get(id)?.send({ type: 'COLLAPSE' });
      }
    },
  });

  // Refs so the actor subscription (set up once per id) always sees the
  // latest mutators — useConstrainedSet returns fresh closures each render.
  const addExpandedRef = useRef(expanded.add);
  useEffect(() => {
    addExpandedRef.current = expanded.add;
  });
  const removeExpandedRef = useRef(expanded.remove);
  useEffect(() => {
    removeExpandedRef.current = expanded.remove;
  });

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

    // Spawn actors for newly-introduced ids. The subscriber's only job is
    // to mirror actor state into `expanded`; the constraint handles the
    // cross-actor coordination via onEvict above.
    for (const id of ids) {
      if (actors.has(id)) continue;
      const actor = createActor(medMachine, { input: { id } });

      actor.subscribe((snapshot) => {
        if (snapshot.matches('expanded')) addExpandedRef.current(id);
        else removeExpandedRef.current(id);
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
