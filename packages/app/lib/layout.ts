export type GridStrategy = 'two-cols' | 'three-cols' | 'auto-square';

export function compressedTileStyle(
  strategy: GridStrategy,
  screenWidth: number,
  count: number,
  gap: number,
  rootPadding: number,
): { width: number; aspectRatio: number } {
  const available = screenWidth - rootPadding * 2;
  let cols: number;
  if (strategy === 'two-cols') cols = 2;
  else if (strategy === 'three-cols') cols = 3;
  else cols = Math.max(2, Math.ceil(Math.sqrt(count)));
  const width = (available - gap * (cols - 1)) / cols;
  return { width, aspectRatio: 1 };
}
