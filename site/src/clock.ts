/**
 * The clock of the page: the minute of the day. It starts at the time of the computer. When the visitor moves it, it
 * stays at that minute until the visitor asks for the real time again.
 */
const MINUTES_IN_A_DAY = 1440;

const minuteOf = (date: Date): number => date.getHours() * 60 + date.getMinutes();
const wrap = (minute: number): number => ((minute % MINUTES_IN_A_DAY) + MINUTES_IN_A_DAY) % MINUTES_IN_A_DAY;

/** A date with no change of the clock, so that each minute of the day exists. */
export const dateAt = (minute: number): Date => new Date(2026, 0, 15, Math.floor(minute / 60), minute % 60);

let minute = minuteOf(new Date());
let date = dateAt(minute);
let held = false;
const listeners = new Set<() => void>();

function show(next: number): void {
  minute = wrap(next);
  date = dateAt(minute);
  for (const listener of listeners) listener();
}

export const clockMinute = (): number => minute;
export const clockDate = (): Date => date;
export const clockHeld = (): boolean => held;

/** This function gives the app a new date for the same minute, as a tick of the clock does. */
export function tickClock(): void {
  show(minute);
}

/** This function moves the clock to a minute of the day, and holds it there. */
export function holdClock(next: number): void {
  held = true;
  show(next);
}

/** This function gives the clock the time of the computer again. */
export function releaseClock(): void {
  held = false;
  show(minuteOf(new Date()));
}

/** This function adds a listener, and gives the function that removes it. */
export function onClock(listener: () => void): () => void {
  listeners.add(listener);
  return () => void listeners.delete(listener);
}

// The real clock of the app ticks each minute. This one does too, until the visitor holds it.
if (typeof window !== "undefined") {
  window.setInterval(() => {
    if (!held) show(minuteOf(new Date()));
  }, 60_000);
}
