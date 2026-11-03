// The day of each item: one row per item, one dot per result of dosesInDay, and a line at the clock.
import { byId, h } from "@mark1russell7/site-pages/chrome";
import { dosesInDay, formatClockHour, nextDose } from "@meds/app/lib/schedule";
import type { Med } from "@meds/app/types";
import { clockDate, clockMinute } from "./clock.ts";
import { nextText } from "./controls.ts";

const place = (hour: number): string => `${(hour / 24) * 100}%`;

/** This function gives the kind of a dose: the next one, one before the clock, or one later today. */
function doseKind(hour: number, next: { hour: number; tomorrow: boolean }, hourNow: number): string {
  if (hour === next.hour) return next.tomorrow ? "tomorrow" : "next";
  return hour <= hourNow ? "past" : "later";
}

export class ScheduleView {
  constructor() {
    byId("axis").replaceChildren(...[0, 6, 12, 18].map((hour) => h("span", { style: `left:${place(hour)}` }, formatClockHour(hour))));
  }

  render(meds: readonly Med[], focus: Med): void {
    const now = clockDate();
    const hourNow = clockMinute() / 60;
    byId("rows").replaceChildren(
      ...meds.map((med) => {
        const next = nextDose(med, med.offset, now);
        const doses = dosesInDay(med, med.offset);
        return h(
          "div",
          { class: "row", "data-med": med.id, "data-focus": med.id === focus.id },
          h("div", { class: "row-head" }, h("strong", {}, med.name), h("span", { class: "every" }, `every ${med.interval}h`), h("span", { class: "row-next" }, `next ${nextText(next)}`)),
          h(
            "div",
            { class: "track", role: "img", "aria-label": `${med.name}: doses at ${doses.map(formatClockHour).join(", ")}` },
            h("i", { class: "now", style: `left:${place(hourNow)}` }),
            ...doses.map((hour) => {
              const kind = doseKind(hour, next, hourNow);
              return h("span", { class: `dose ${kind}`, "data-hour": hour, "data-kind": kind, style: `left:${place(hour)}` }, h("i", {}), h("b", {}, formatClockHour(hour)));
            }),
          ),
        );
      }),
    );
  }
}
