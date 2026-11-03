/** This hook has the place of `useClock` of the app. It gives the date of the clock of the page, so a visitor can move the time. */
import { useSyncExternalStore } from "react";
import { clockDate, onClock } from "../clock.ts";

export function useClock(_intervalMs: number = 60_000): Date {
  return useSyncExternalStore(onClock, clockDate);
}
