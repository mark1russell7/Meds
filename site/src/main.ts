// The start of the page: the theme, the real app in the phone frame, and the views that follow it.
import { byId, setupTheme, showBuild } from "@mark1russell7/site-pages/chrome";
import { medMachine } from "@meds/app/lib/medMachine";
import { onBridge, type Step } from "./bridge.ts";
import { onClock } from "./clock.ts";
import { Controls } from "./controls.ts";
import { graphOf, type MachineConfig } from "./graph.ts";
import { MachineView } from "./machine-view.ts";
import { onMeds, readMeds } from "./meds.ts";
import { startPhone } from "./phone.ts";
import { ScheduleView } from "./schedule-view.ts";
import "./style.css";

setupTheme(byId<HTMLButtonElement>("theme"), "meds-theme");

let focus: string | undefined;
let lastStep: Step | undefined;

const select = (id: string): void => {
  focus = id;
  refresh();
};

const controls = new Controls(select);
const machine = new MachineView(graphOf(medMachine.config as MachineConfig));
const schedule = new ScheduleView();

function render(): void {
  const meds = readMeds();
  const med = meds.find((candidate) => candidate.id === focus) ?? meds[0];
  if (med === undefined) return;
  focus = med.id;
  controls.render(meds, med);
  machine.render(meds, med, lastStep);
  schedule.render(meds, med);
}

let queued = false;
function refresh(): void {
  if (queued) return;
  queued = true;
  queueMicrotask(() => {
    queued = false;
    render();
  });
}

onBridge((step) => {
  if (step !== undefined) lastStep = step;
  // The panels follow the tile that the visitor opens.
  if (step?.to === "expanded") focus = step.id;
  refresh();
});
onClock(refresh);
onMeds(refresh);

startPhone(byId("app-root"));

showBuild(byId("build"), __BUILD__, "mark1russell7/Meds");
