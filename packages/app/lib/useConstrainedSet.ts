import { useCallback, useState } from 'react';

/**
 * Cardinality constraint enforced on every mutation.
 *
 * - `'none'`         — any subset is valid. (Multi-select.)
 * - `'at-most-one'`  — size ∈ {0, 1}. Adding replaces. (Accordion / single-expansion.)
 * - `'at-least-one'` — size ≥ 1. The last item cannot be removed.
 * - `'exactly-one'`  — size = 1. Like radio buttons.
 *
 * Constraints are *only* applied to user-initiated mutations (add/remove/toggle/
 * clear). The initial value is taken as given — if it violates the constraint
 * (e.g. empty set with `'exactly-one'`), the first valid mutation will pull it
 * back in line.
 */
export type Constraint = 'none' | 'at-most-one' | 'at-least-one' | 'exactly-one';

export type UseConstrainedSetOptions<T> = {
  /** Cardinality rule. Defaults to `'none'`. */
  constraint?: Constraint;
  /** Initial members. */
  initial?: Iterable<T>;
  /**
   * Fires synchronously before each state update. Useful for wiring
   * `LayoutAnimation.configureNext(...)` (or other side-effects) right next
   * to the mutation that triggered the layout change.
   */
  beforeChange?: () => void;
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

const requiresNonEmpty = (c: Constraint): boolean =>
  c === 'at-least-one' || c === 'exactly-one';

const requiresAtMostOne = (c: Constraint): boolean =>
  c === 'at-most-one' || c === 'exactly-one';

/**
 * A `Set<T>` with optional cardinality constraints. The fundamental primitive
 * that `useExpansion` and similar selection hooks all reduce to.
 */
export function useConstrainedSet<T>(
  opts: UseConstrainedSetOptions<T> = {},
): ConstrainedSetApi<T> {
  const constraint = opts.constraint ?? 'none';
  const { beforeChange } = opts;
  const [items, setItems] = useState<Set<T>>(() => new Set(opts.initial));

  const has = useCallback((item: T) => items.has(item), [items]);

  const add = useCallback(
    (item: T) => {
      setItems((prev) => {
        // Already a member and not forced to be the only one → no-op.
        if (prev.has(item) && (!requiresAtMostOne(constraint) || prev.size === 1)) {
          return prev;
        }
        beforeChange?.();
        if (requiresAtMostOne(constraint)) return new Set([item]);
        const next = new Set(prev);
        next.add(item);
        return next;
      });
    },
    [constraint, beforeChange],
  );

  const remove = useCallback(
    (item: T) => {
      setItems((prev) => {
        if (!prev.has(item)) return prev;
        if (requiresNonEmpty(constraint) && prev.size <= 1) return prev;
        beforeChange?.();
        const next = new Set(prev);
        next.delete(item);
        return next;
      });
    },
    [constraint, beforeChange],
  );

  const toggle = useCallback(
    (item: T) => {
      setItems((prev) => {
        if (prev.has(item)) {
          if (requiresNonEmpty(constraint) && prev.size <= 1) return prev;
          beforeChange?.();
          const next = new Set(prev);
          next.delete(item);
          return next;
        }
        beforeChange?.();
        if (requiresAtMostOne(constraint)) return new Set([item]);
        const next = new Set(prev);
        next.add(item);
        return next;
      });
    },
    [constraint, beforeChange],
  );

  const clear = useCallback(() => {
    setItems((prev) => {
      if (prev.size === 0) return prev;
      if (requiresNonEmpty(constraint)) return prev;
      beforeChange?.();
      return new Set();
    });
  }, [constraint, beforeChange]);

  return { items, has, add, remove, toggle, clear };
}
