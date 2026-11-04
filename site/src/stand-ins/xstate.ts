/**
 * This module gives `useMedRegistry` of the app the real `createActor` of XState. The only change: the page also gets
 * each actor and each of its steps. The machine, its transitions and its rules do not change.
 */
import { createActor as realCreateActor } from "xstate";
import { recordActor, recordStep } from "../bridge.ts";
import { tickClock } from "../clock.ts";

let tickQueued = false;

/**
 * The app makes its actors in an effect, after the render that has the items, and it draws a tile only when the actor
 * exists. At the first start, a phone shows no tile until the next tick of the clock. The page gives that tick at once.
 */
function tickSoon(): void {
  if (tickQueued) return;
  tickQueued = true;
  queueMicrotask(() => {
    tickQueued = false;
    tickClock();
  });
}

interface Inspection {
  readonly type: string;
  readonly snapshot?: { readonly value?: unknown };
  readonly event?: { readonly type: string };
}

export const createActor = ((logic: never, options: { input: { id: string } }) => {
  const { id } = options.input;
  const actor = realCreateActor(logic, {
    ...options,
    inspect: (inspection: Inspection) => {
      if (inspection.type === "@xstate.snapshot") recordStep(id, inspection.event?.type ?? "", String(inspection.snapshot?.value));
    },
  } as never) as unknown as { send(event: { type: string }): void };
  recordActor(id, actor);
  tickSoon();
  return actor;
}) as unknown as typeof realCreateActor;
