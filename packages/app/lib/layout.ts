import type { ViewStyle } from 'react-native';

/**
 * A pluggable layout for `<Iterator>`. Two halves:
 *   - `containerStyle`: applied to the iterator's outer View
 *   - `itemStyle`: called per item to compute the View style for that slot
 *
 * Strategies are produced by factory functions in this file (gridLayout, …).
 * To add a new layout (list, masonry, stack, horizontal-scroll, …), export
 * another factory that returns the same shape.
 */
export type LayoutStrategy = {
  containerStyle: ViewStyle;
  itemStyle: (index: number, count: number, screenWidth: number) => ViewStyle;
};

export type GridCols = number | 'auto-square';

export type GridLayoutOptions = {
  cols: GridCols;
  /** Gap between items in pixels. Defaults to 10. */
  gap?: number;
  /** Outer padding around the grid in pixels. Defaults to 16. */
  padding?: number;
  /** Item aspect ratio (width / height). Defaults to 1 (square). */
  aspectRatio?: number;
};

/**
 * Wrapping flex grid. `cols` is either a fixed number or 'auto-square' which
 * picks ceil(sqrt(count)) so the cell count roughly squares the visible area.
 */
export function gridLayout(opts: GridLayoutOptions): LayoutStrategy {
  const gap = opts.gap ?? 10;
  const padding = opts.padding ?? 16;
  const aspectRatio = opts.aspectRatio ?? 1;
  return {
    containerStyle: {
      flex: 1,
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignContent: 'flex-start',
      gap,
      padding,
    },
    itemStyle: (_index, count, screenWidth) => {
      const cols =
        opts.cols === 'auto-square'
          ? Math.max(2, Math.ceil(Math.sqrt(count)))
          : opts.cols;
      const available = screenWidth - padding * 2;
      const width = (available - gap * (cols - 1)) / cols;
      return { width, aspectRatio };
    },
  };
}

export type ListLayoutOptions = {
  /** Gap between items in pixels. Defaults to 10. */
  gap?: number;
  /** Outer padding in pixels. Defaults to 16. */
  padding?: number;
  /**
   * Fixed item height in pixels. If omitted, each item sizes to its content.
   */
  itemHeight?: number;
};

/**
 * Single-column vertical list. Each item takes the full width minus padding.
 * Suitable for log views, settings, etc.
 */
export function listLayout(opts: ListLayoutOptions = {}): LayoutStrategy {
  const gap = opts.gap ?? 10;
  const padding = opts.padding ?? 16;
  const itemHeight = opts.itemHeight;
  return {
    containerStyle: {
      flex: 1,
      flexDirection: 'column',
      gap,
      padding,
    },
    itemStyle: () => ({
      width: '100%',
      ...(itemHeight !== undefined ? { height: itemHeight } : {}),
    }),
  };
}
