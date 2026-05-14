import { useCallback, useState } from 'react';

export type ExpansionMode = 'single' | 'multiple';

export type UseExpansionOptions = {
  /**
   * 'single' (default): expanding an id collapses any previously expanded one.
   * 'multiple': any number can be expanded at once.
   */
  mode?: ExpansionMode;
  /**
   * Fires synchronously *before* each state update. Useful for hooking in
   * `LayoutAnimation.configureNext(...)` so the transition animates.
   */
  beforeChange?: () => void;
  /** Initial expansion set. Defaults to empty. */
  initialExpanded?: Iterable<string>;
};

export type ExpansionApi = {
  expandedIds: ReadonlySet<string>;
  isExpanded: (id: string) => boolean;
  /** Add `id` to the expanded set (collapsing others in 'single' mode). */
  expand: (id: string) => void;
  /** Remove `id` from the expanded set. No-op if already collapsed. */
  collapse: (id: string) => void;
  /** Flip the state of `id`. In 'single' mode, expanding a different id collapses the previous. */
  toggle: (id: string) => void;
  /** Clear all expansions. */
  collapseAll: () => void;
};

/**
 * Tracks which ids in a set are "expanded". Originally written for "one med
 * tile expanded at a time" but generalized: pass `mode: 'multiple'` for an
 * accordion-style list where any number can be open.
 *
 * Underlying state is a `Set<string>` — in single mode it just stays ≤1
 * element. Future generalization (a typed "boolean map with constraint
 * options") can sit on top of this without changing the API.
 */
export function useExpansion(opts: UseExpansionOptions = {}): ExpansionApi {
  const { mode = 'single', beforeChange, initialExpanded } = opts;
  const [expandedIds, setExpandedIds] = useState<Set<string>>(
    () => new Set(initialExpanded),
  );

  const isExpanded = useCallback(
    (id: string) => expandedIds.has(id),
    [expandedIds],
  );

  const expand = useCallback(
    (id: string) => {
      setExpandedIds((prev) => {
        if (prev.has(id) && (mode === 'multiple' || prev.size === 1)) return prev;
        beforeChange?.();
        const next = new Set(mode === 'single' ? [] : prev);
        next.add(id);
        return next;
      });
    },
    [mode, beforeChange],
  );

  const collapse = useCallback(
    (id: string) => {
      setExpandedIds((prev) => {
        if (!prev.has(id)) return prev;
        beforeChange?.();
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    },
    [beforeChange],
  );

  const toggle = useCallback(
    (id: string) => {
      setExpandedIds((prev) => {
        if (prev.has(id)) {
          beforeChange?.();
          const next = new Set(prev);
          next.delete(id);
          return next;
        }
        beforeChange?.();
        const next = new Set(mode === 'single' ? [] : prev);
        next.add(id);
        return next;
      });
    },
    [mode, beforeChange],
  );

  const collapseAll = useCallback(() => {
    setExpandedIds((prev) => {
      if (prev.size === 0) return prev;
      beforeChange?.();
      return new Set();
    });
  }, [beforeChange]);

  return { expandedIds, isExpanded, expand, collapse, toggle, collapseAll };
}
