/** The link between the running app and the page: the actors of the tiles, their states and the steps that they took. */

/** One event at one actor. `from` and `to` are equal when the machine has no transition for the event. */
export interface Step {
  readonly id: string;
  readonly event: string;
  readonly from: string;
  readonly to: string;
  /** True when the app sent the event to keep one tile expanded, not the visitor. */
  readonly byRule: boolean;
}

interface Sender {
  send(event: { type: string }): void;
}

const LOG_SIZE = 8;

const actors = new Map<string, Sender>();
const states = new Map<string, string>();
const log: Step[] = [];
const listeners = new Set<(step: Step | undefined) => void>();
let sending: string | undefined;

const tell = (step: Step | undefined): void => {
  for (const listener of listeners) listener(step);
};

export function recordActor(id: string, actor: Sender): void {
  actors.set(id, actor);
  tell(undefined);
}

/** This function records a step of an actor. The first step of an actor is its start, so it only sets the state. */
export function recordStep(id: string, event: string, to: string): void {
  const from = states.get(id);
  states.set(id, to);
  if (from === undefined || event.startsWith("xstate.")) {
    tell(undefined);
    return;
  }
  const step: Step = { id, event, from, to, byRule: sending !== id && event === "COLLAPSE" };
  log.unshift(step);
  log.length = Math.min(log.length, LOG_SIZE);
  tell(step);
}

/** This function sends an event to the real actor of a tile. */
export function sendEvent(id: string, type: string): void {
  sending = id;
  try {
    actors.get(id)?.send({ type });
  } finally {
    sending = undefined;
  }
}

export const stateOf = (id: string): string | undefined => states.get(id);
export const steps = (): readonly Step[] => log;
export const expandedTiles = (): string[] => [...states].filter(([, state]) => state === "expanded").map(([id]) => id);

/** This function adds a listener. It gets the new step, or undefined when only an actor or a state started. */
export function onBridge(listener: (step: Step | undefined) => void): () => void {
  listeners.add(listener);
  return () => void listeners.delete(listener);
}
