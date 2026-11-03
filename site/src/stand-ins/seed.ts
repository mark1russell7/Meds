/**
 * The sample items of the page. This list replaces the seed of the app at build time. Each name is invented, and no
 * name is a real medicine. The intervals and the hours are examples only, so they are not advice.
 */
import type { Med } from "@meds/app/types";

export const SEED_MEDS: Med[] = [
  { id: "moonfizz", name: "Moonfizz", interval: 8, offset: 6 },
  { id: "wobblemint", name: "Wobblemint", interval: 12, offset: 9 },
  { id: "sunnydrop", name: "Sunnydrop", interval: 6, offset: 2 },
  { id: "plinkotab", name: "Plinkotab", interval: 3, offset: 1 },
  { id: "zoomberry", name: "Zoomberry", interval: 24, offset: 8 },
];
