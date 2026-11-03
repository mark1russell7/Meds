/** The page reads and writes the same SignalDB collection as the app, with the same calls. */
import { medsCollection } from "@meds/app/lib/medsCollection";
import type { Med } from "@meds/app/types";

export const readMeds = (): Med[] => medsCollection.find({}, { reactive: false }).fetch();

/** This function does what `setOffset` of `useMedsRepository` does. That function is a hook, so a page cannot call it. */
export function setOffset(id: string, offset: number): void {
  medsCollection.updateOne({ id }, { $set: { offset } });
}

/** The size of the ring of a wheel, as `ExpandedMedTile` computes it. */
export const ringOf = (med: Med): number => (12 % med.interval === 0 ? 12 : 24);

export function onMeds(listener: () => void): void {
  for (const event of ["added", "changed", "removed"] as const) medsCollection.on(event, listener);
}
