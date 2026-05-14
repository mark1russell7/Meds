import type { Med } from '../data';

export const formatHour = (h: number, mode12: boolean): string => {
  if (mode12) return h === 0 ? '12' : String(h);
  return formatClockHour(h);
};

export const formatClockHour = (h: number): string => {
  if (h === 0) return '12a';
  if (h < 12) return `${h}a`;
  if (h === 12) return '12p';
  return `${h - 12}p`;
};

export function dosesInDay(med: Med, offset: number): number[] {
  const mode12 = 12 % med.interval === 0;
  const ringSize = mode12 ? 12 : 24;
  const n = ringSize / med.interval;
  const set = new Set<number>();
  for (let i = 0; i < n; i++) {
    const h = (i * med.interval + offset) % ringSize;
    if (mode12) {
      set.add(h);
      set.add((h + 12) % 24);
    } else {
      set.add(h);
    }
  }
  return [...set].sort((a, b) => a - b);
}

export function nextDose(
  med: Med,
  offset: number,
  now: Date,
): { hour: number; tomorrow: boolean } {
  const doses = dosesInDay(med, offset);
  if (doses.length === 0) return { hour: 0, tomorrow: false };
  const hourNow = now.getHours() + now.getMinutes() / 60;
  const upcoming = doses.find((h) => h > hourNow);
  return upcoming !== undefined
    ? { hour: upcoming, tomorrow: false }
    : { hour: doses[0], tomorrow: true };
}
