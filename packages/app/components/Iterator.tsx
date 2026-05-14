import { Fragment, type ReactNode } from 'react';
import { View, type ViewStyle, useWindowDimensions } from 'react-native';
import type { LayoutStrategy } from '../lib/layout';

/** Per-item info handed to the render function. */
export type IteratorSlot = {
  /** The View style that the current layout strategy wants this item to occupy. */
  itemStyle: ViewStyle;
  index: number;
  count: number;
};

export type IteratorProps<T> = {
  items: T[];
  layout: LayoutStrategy;
  /** Render function ("let-item"). Receives the item and slot info. */
  children: (item: T, slot: IteratorSlot) => ReactNode;
  /** Stable React key per item. Defaults to the index, which is fine for static lists. */
  keyExtractor?: (item: T, index: number) => string;
};

/**
 * Generic, layout-agnostic list renderer. Iterates `items` and delegates
 * placement to `layout`. The render function is responsible for applying
 * `slot.itemStyle` to its rendered root — that way an item can choose to
 * override the layout (e.g. an expanded med tile claiming full width)
 * without the iterator needing to know about expansion semantics.
 *
 * Usage:
 * ```tsx
 * <Iterator items={meds} layout={gridLayout({ cols: 2 })} keyExtractor={m => m.id}>
 *   {(med, { itemStyle }) => <MedTile med={med} style={itemStyle} />}
 * </Iterator>
 * ```
 */
export function Iterator<T>({
  items,
  layout,
  children,
  keyExtractor,
}: IteratorProps<T>): ReactNode {
  const { width: screenWidth } = useWindowDimensions();
  return (
    <View style={layout.containerStyle}>
      {items.map((item, i) => {
        const slot: IteratorSlot = {
          itemStyle: layout.itemStyle(i, items.length, screenWidth),
          index: i,
          count: items.length,
        };
        const key = keyExtractor ? keyExtractor(item, i) : String(i);
        return <Fragment key={key}>{children(item, slot)}</Fragment>;
      })}
    </View>
  );
}
