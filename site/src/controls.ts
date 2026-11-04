// The controls beside the phone: the clock, the tile chips, the next dose and the hour buttons.
import { byId, h } from "@mark1russell7/site-pages/chrome";
import { dosesInDay, formatClockHour, nextDose } from "@meds/app/lib/schedule";
import type { Med } from "@meds/app/types";
import { stateOf } from "./bridge.ts";
import { clockDate, clockHeld, clockMinute, holdClock, releaseClock } from "./clock.ts";
import { ringOf, setOffset } from "./meds.ts";

/** This function writes a minute of the day in the style of the app: `9:30a`, `12:00p`. */
export function clockText(minute: number): string {
  const hour = Math.floor(minute / 60);
  const label = formatClockHour(hour);
  return `${label.slice(0, -1)}:${String(minute % 60).padStart(2, "0")}${label.slice(-1)}`;
}

/** This function writes a next dose as a tile of the app does: `+` marks a dose of tomorrow. */
export const nextText = (next: { hour: number; tomorrow: boolean }): string => `${formatClockHour(next.hour)}${next.tomorrow ? "+" : ""}`;

export class Controls {
  private readonly slider = byId<HTMLInputElement>("clock");
  private readonly tiles = byId("tiles");
  private focus: Med | undefined;

  constructor(select: (id: string) => void) {
    this.slider.addEventListener("input", () => holdClock(Number(this.slider.value)));
    byId("real-time").addEventListener("click", releaseClock);
    byId("jump").addEventListener("click", () => {
      if (this.focus === undefined) return;
      holdClock(nextDose(this.focus, this.focus.offset, clockDate()).hour * 60);
    });
    byId("hour-down").addEventListener("click", () => this.shift(-1));
    byId("hour-up").addEventListener("click", () => this.shift(1));
    this.tiles.addEventListener("click", (event) => {
      const button = (event.target as HTMLElement).closest<HTMLButtonElement>("button[data-tile]");
      if (button?.dataset["tile"] !== undefined) select(button.dataset["tile"]);
    });
  }

  private shift(step: number): void {
    if (this.focus === undefined) return;
    const ring = ringOf(this.focus);
    setOffset(this.focus.id, (this.focus.offset + step + ring) % ring);
  }

  render(meds: readonly Med[], med: Med): void {
    this.focus = med;
    const minute = clockMinute();
    this.slider.value = String(minute);
    byId("clock-label").textContent = clockText(minute);
    byId("real-time").toggleAttribute("disabled", !clockHeld());
    this.tiles.replaceChildren(
      ...meds.map((item) =>
        h(
          "button",
          { type: "button", class: "chip tile-chip", "data-tile": item.id, "data-state": stateOf(item.id) ?? "", "aria-pressed": item.id === med.id },
          h("i", { "aria-hidden": "true" }),
          item.name,
        ),
      ),
    );
    byId("focus-name").textContent = med.name;
    byId("next-dose").textContent = nextText(nextDose(med, med.offset, clockDate()));
    byId("doses").textContent = dosesInDay(med, med.offset).map(formatClockHour).join(", ");
  }
}
