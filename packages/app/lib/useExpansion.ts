import { useConstrainedSet } from './useConstrainedSet';

export type ExpansionMode = 'single' | 'multiple';

export type UseExpansionOptions = {
  /**
   * 'single' (default): expanding an id collapses any previously expanded one.
   * 'multiple': any number can be expanded at once.
   */
  mode?: ExpansionMode;
  /** Fires synchronously before each state update. Wire in `LayoutAnimation` here. */
  beforeChange?: () => void;
  /** Initial expansion set. Defaults to empty. */
  initialExpanded?: Iterable<string>;
};

export type ExpansionApi = {
  expandedIds: ReadonlySet<string>;
  isExpanded: (id: string) => boolean;
  expand: (id: string) => void;
  collapse: (id: string) => void;
  toggle: (id: string) => void;
  collapseAll: () => void;
};

/**
 * Domain-named wrapper over `useConstrainedSet`. "Expansion" is just a
 * constrained set: in `'single'` mode the underlying constraint is
 * `'at-most-one'`; in `'multiple'` mode it's `'none'`. Kept as a separate
 * export because `expand` / `collapse` / `expandedIds` read better than
 * `add` / `remove` / `items` at the call site.
 */
export function useExpansion(opts: UseExpansionOptions = {}): ExpansionApi {
  const { mode = 'single', beforeChange, initialExpanded } = opts;
  const set = useConstrainedSet<string>({
    constraint: mode === 'single' ? 'at-most-one' : 'none',
    initial: initialExpanded,
    beforeChange,
  });
  return {
    expandedIds: set.items,
    isExpanded: set.has,
    expand: set.add,
    collapse: set.remove,
    toggle: set.toggle,
    collapseAll: set.clear,
  };
}
