import { useMemo } from 'react';
import * as Haptics from 'expo-haptics';

export type HapticsApi = {
  /** Light "selection" tick — the iOS picker click. */
  tick: () => void;
  /** Medium impact thud. Pass a style to override intensity. */
  impact: (style?: Haptics.ImpactFeedbackStyle) => void;
  /** Success / warning / error notification haptic. */
  notify: (type?: Haptics.NotificationFeedbackType) => void;
};

/**
 * Thin wrapper over expo-haptics. Returns stable callable functions so they
 * can be passed as deps without re-creating each render.
 *
 * Each call swallows errors (some devices / settings disable haptics) so
 * callers don't need to await or try/catch.
 */
export function useHaptics(): HapticsApi {
  return useMemo(
    () => ({
      tick: () => {
        Haptics.selectionAsync().catch(() => {});
      },
      impact: (style = Haptics.ImpactFeedbackStyle.Medium) => {
        Haptics.impactAsync(style).catch(() => {});
      },
      notify: (type = Haptics.NotificationFeedbackType.Success) => {
        Haptics.notificationAsync(type).catch(() => {});
      },
    }),
    [],
  );
}
