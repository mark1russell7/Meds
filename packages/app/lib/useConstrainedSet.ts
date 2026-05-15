import { useMemo } from 'react';
import {
  useConstrainedMap,
  type Constraint,
  type EvictCause,
} from './useConstrainedMap';

export type { Constraint, EvictCause };

export type UseConstrainedSetOptions<T> = {
  constraint?: Constraint;
  initial?: Iterable<T>;
  beforeChange?: () => void;
  /**
   * Fires synchronously when items are removed from the set. See
   * `useConstrainedMap`'s `onEvict` for the precise timing semantics and the
   * meaning of each `cause`.
   */
  onEvict?: (items: T[], cause: EvictCause) => void;
};

export type ConstrainedSetApi<T> = {
  items: ReadonlySet<T>;
  has: (item: T) => boolean;
  /** Add `item`. In single-cardinality modes this replaces the current member. */
  add: (item: T) => void;
  /** Remove `item`. No-op if it would violate `at-least-one` / `exactly-one`. */
  remove: (item: T) => void;
  /** Toggle membership. Honors cardinality (e.g. won't empty an `at-least-one`). */
  toggle: (item: T) => void;
  /** Empty the set. No-op when the constraint requires non-empty. */
  clear: () => void;
};

/**
 * Boolean-keyed specialization of `useConstrainedMap` (V = true). Use when
 * the only state you care about is "is this key present?" — selection,
 * expansion, toggles. The set is just the key space of a Map<T, true>; the
 * constraint logic comes from the underlying useConstrainedMap unchanged.
 */
export function useConstrainedSet<T>(
  opts: UseConstrainedSetOptions<T> = {},
): ConstrainedSetApi<T> {
  const initialEntries = useMemo<Iterable<readonly [T, true]> | undefined>(
    () =>
      opts.initial
        ? Array.from(opts.initial, (v) => [v, true] as const)
        : undefined,
    [opts.initial],
  );

  const map = useConstrainedMap<T, true>({
    constraint: opts.constraint,
    initial: initialEntries,
    beforeChange: opts.beforeChange,
    onEvict: opts.onEvict
      ? (entries, cause) => opts.onEvict!(Array.from(entries.keys()), cause)
      : undefined,
  });

  // `Set` view of the key space. Memoized off `map.entries` so identity is
  // stable across renders that don't change the keys.
  const items = useMemo(() => new Set(map.entries.keys()), [map.entries]);

  return {
    items,
    has: (item) => map.entries.has(item),
    add: (item) => map.set(item, true),
    remove: (item) => map.delete(item),
    toggle: (item) => {
      if (map.entries.has(item)) map.delete(item);
      else map.set(item, true);
    },
    clear: map.clear,
  };
}
