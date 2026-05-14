import { useEffect, useMemo, useRef } from 'react';

export type LongPressController = {
  /** Start the long-press timer. Call from PanResponder.onPanResponderGrant. */
  start: () => void;
  /** Tell the timer about gesture motion. If beyond threshold, the timer cancels. */
  reportMovement: (dx: number, dy: number) => void;
  /** Cancel the timer (e.g. from onPanResponderRelease). */
  cancel: () => void;
  /** Whether the long-press timer fired this gesture. */
  wasActivated: () => boolean;
};

export type UseLongPressOptions = {
  /** Hold duration in ms before activation. Default 500. */
  ms?: number;
  /** Pixel threshold of pan movement that cancels the press. Default 5. */
  movementThresholdPx?: number;
  /** Fires once when the timer elapses without being cancelled. */
  onActivate?: () => void;
};

/**
 * Generic long-press timer. Doesn't own a PanResponder — the caller does, and
 * wires this hook's methods into the lifecycle. That way useLongPress can be
 * composed with any gesture system (PanResponder, react-native-gesture-handler,
 * etc.) without prescribing one.
 */
export function useLongPress(opts: UseLongPressOptions = {}): LongPressController {
  const { ms = 500, movementThresholdPx = 5 } = opts;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activatedRef = useRef(false);
  const onActivateRef = useRef(opts.onActivate);

  useEffect(() => {
    onActivateRef.current = opts.onActivate;
  }, [opts.onActivate]);

  // Cleanup on unmount.
  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  return useMemo<LongPressController>(
    () => ({
      start: () => {
        activatedRef.current = false;
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
          activatedRef.current = true;
          onActivateRef.current?.();
          timerRef.current = null;
        }, ms);
      },
      reportMovement: (dx, dy) => {
        if (Math.abs(dx) > movementThresholdPx || Math.abs(dy) > movementThresholdPx) {
          if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
          }
        }
      },
      cancel: () => {
        if (timerRef.current) {
          clearTimeout(timerRef.current);
          timerRef.current = null;
        }
      },
      wasActivated: () => activatedRef.current,
    }),
    [ms, movementThresholdPx],
  );
}
