import { useEffect, useState } from 'react';

/**
 * Returns a `Date` that ticks every `intervalMs`. Defaults to 60s, which is
 * the natural granularity for clock-face style time displays.
 *
 * The returned Date is a fresh instance per tick, so consumers using
 * `now.getHours() + now.getMinutes() / 60` (etc.) in render will re-render
 * exactly on the cadence they care about.
 */
export function useClock(intervalMs: number = 60_000): Date {
  const [now, setNow] = useState<Date>(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}
