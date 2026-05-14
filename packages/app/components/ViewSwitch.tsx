import { type ReactNode } from 'react';

export type ViewSwitchProps<TMode extends string> = {
  /** Current mode key — selects which view function to invoke. */
  mode: TMode;
  /** Required map of every possible mode to a render function. */
  views: Record<TMode, () => ReactNode>;
};

/**
 * Generic mode → render dispatcher. The render functions are invoked lazily,
 * so only the active view's tree is constructed. TypeScript enforces that
 * `views` covers every member of the `TMode` union — no fallback prop needed.
 *
 * Pair with any state source (`useState`, `useReducer`, XState selector, etc.):
 *
 *   <ViewSwitch mode={machine.state} views={{
 *     compressed: () => <Compressed />,
 *     expanded:   () => <Expanded />,
 *   }} />
 */
export function ViewSwitch<TMode extends string>({
  mode,
  views,
}: ViewSwitchProps<TMode>): ReactNode {
  return views[mode]();
}
