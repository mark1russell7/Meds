import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Cardinality constraint enforced on every mutation.
 *
 * - `'none'`         — any subset of keys is valid (multi-select).
 * - `'at-most-one'`  — size ∈ {0, 1}. Setting replaces. (Accordion / single-expansion.)
 * - `'at-least-one'` — size ≥ 1. The last entry cannot be removed.
 * - `'exactly-one'`  — size = 1. Like radio buttons.
 *
 * Constraints are only applied to user-initiated mutations (set / delete /
 * clear). The initial value is taken as given — if it violates the constraint
 * (e.g. empty map with `'exactly-one'`), the first valid mutation pulls it
 * back in line.
 */
export type Constraint = 'none' | 'at-most-one' | 'at-least-one' | 'exactly-one';

export type UseConstrainedMapOptions<K, V> = {
  /** Cardinality rule. Defaults to `'none'`. */
  constraint?: Constraint;
  /** Initial entries. */
  initial?: Iterable<readonly [K, V]>;
  /**
   * Fires synchronously before each state update. Useful for wiring
   * `LayoutAnimation.configureNext(...)` (or other side-effects) right next
   * to the mutation that triggered the layout change.
   */
  beforeChange?: () => void;
};

export type ConstrainedMapApi<K, V> = {
  entries: ReadonlyMap<K, V>;
  has: (key: K) => boolean;
  get: (key: K) => V | undefined;
  /** Insert / replace `key -> value`. In single-cardinality modes this replaces the current entry. */
  set: (key: K, value: V) => void;
  /** Remove `key`. No-op if it would violate `at-least-one` / `exactly-one`. */
  delete: (key: K) => void;
  /** Empty the map. No-op when the constraint requires non-empty. */
  clear: () => void;
};

const requiresNonEmpty = (c: Constraint): boolean =>
  c === 'at-least-one' || c === 'exactly-one';

const requiresAtMostOne = (c: Constraint): boolean =>
  c === 'at-most-one' || c === 'exactly-one';

/**
 * A `Map<K, V>` with optional cardinality constraints on its key space. The
 * fundamental primitive that `useConstrainedSet` reduces to via `V = true`.
 * Reach for this directly when each key needs an associated value (selection
 * metadata, per-item config, etc.).
 */
export function useConstrainedMap<K, V>(
  opts: UseConstrainedMapOptions<K, V> = {},
): ConstrainedMapApi<K, V> {
  const constraint = opts.constraint ?? 'none';
  const [entries, setEntries] = useState<Map<K, V>>(() => new Map(opts.initial));

  // Keep beforeChange in a ref so the mutation callbacks below stay stable
  // across renders even when the consumer passes an inline arrow function.
  const beforeChangeRef = useRef(opts.beforeChange);
  useEffect(() => {
    beforeChangeRef.current = opts.beforeChange;
  }, [opts.beforeChange]);

  const set = useCallback(
    (key: K, value: V) => {
      setEntries((prev) => {
        // Already there with same value AND not forced to be alone → no-op.
        if (
          prev.has(key) &&
          prev.get(key) === value &&
          (!requiresAtMostOne(constraint) || prev.size === 1)
        ) {
          return prev;
        }
        beforeChangeRef.current?.();
        if (requiresAtMostOne(constraint)) return new Map([[key, value]]);
        const next = new Map(prev);
        next.set(key, value);
        return next;
      });
    },
    [constraint],
  );

  const del = useCallback(
    (key: K) => {
      setEntries((prev) => {
        if (!prev.has(key)) return prev;
        if (requiresNonEmpty(constraint) && prev.size <= 1) return prev;
        beforeChangeRef.current?.();
        const next = new Map(prev);
        next.delete(key);
        return next;
      });
    },
    [constraint],
  );

  const clear = useCallback(() => {
    setEntries((prev) => {
      if (prev.size === 0) return prev;
      if (requiresNonEmpty(constraint)) return prev;
      beforeChangeRef.current?.();
      return new Map();
    });
  }, [constraint]);

  return {
    entries,
    has: (key) => entries.has(key),
    get: (key) => entries.get(key),
    set,
    delete: del,
    clear,
  };
}
