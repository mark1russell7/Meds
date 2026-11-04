/** This module reads the states and the transitions from the config of the real machine, so the diagram cannot drift from it. */

export interface MachineConfig {
  readonly initial?: unknown;
  readonly states?: Record<string, { readonly on?: Record<string, unknown> }>;
}

export interface Edge {
  readonly from: string;
  readonly to: string;
  readonly events: readonly string[];
}

export interface Graph {
  readonly initial: string;
  readonly states: readonly string[];
  readonly edges: readonly Edge[];
  readonly events: readonly string[];
}

export function graphOf(config: MachineConfig): Graph {
  const entries = Object.entries(config.states ?? {});
  const edges = new Map<string, { from: string; to: string; events: string[] }>();
  for (const [from, state] of entries) {
    for (const [event, target] of Object.entries(state.on ?? {})) {
      const to = String(target);
      const key = `${from}>${to}`;
      const edge = edges.get(key) ?? { from, to, events: [] };
      edge.events.push(event);
      edges.set(key, edge);
    }
  }
  return {
    initial: String(config.initial),
    states: entries.map(([name]) => name),
    edges: [...edges.values()],
    events: [...new Set(entries.flatMap(([, state]) => Object.keys(state.on ?? {})))],
  };
}
