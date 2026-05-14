import { gridLayout, listLayout, type LayoutStrategy } from './lib/layout';

/**
 * Top-level app layout. Cycle alternatives by changing this line — hot-reload
 * picks it up.
 *
 *   gridLayout({ cols: 2 })
 *   gridLayout({ cols: 3 })
 *   gridLayout({ cols: 'auto-square' })
 *   listLayout()
 */
export const LAYOUT: LayoutStrategy = gridLayout({ cols: 2 });

// Re-export `listLayout` here so the comment above isn't a lie if someone reads
// just this file — the import keeps it from being tree-shaken away unused.
export { gridLayout, listLayout };
