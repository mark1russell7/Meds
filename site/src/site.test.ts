// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { dosesInDay, nextDose } from "@meds/app/lib/schedule";
import { medMachine } from "@meds/app/lib/medMachine";
import { act } from "react";
import { beforeAll, describe, expect, it } from "vitest";
import { seedValues } from "../browser-app.config.ts";
import { expandedTiles, sendEvent, stateOf, steps } from "./bridge.ts";
import { clockDate, holdClock } from "./clock.ts";
import { graphOf, type MachineConfig } from "./graph.ts";
import { readMeds, setOffset } from "./meds.ts";
import { startPhone } from "./phone.ts";
import { SEED_MEDS } from "./stand-ins/seed.ts";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const flush = async (ms = 20): Promise<void> => {
  await act(async () => {
    await new Promise((done) => setTimeout(done, ms));
  });
};

const mouse = (target: Element, type: string, x: number, buttons: number): void => {
  target.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: 10, button: 0, buttons }));
};

const leaf = (root: Element, text: string): Element => {
  const found = [...root.querySelectorAll("div")].find((element) => element.children.length === 0 && element.textContent === text);
  if (found === undefined) throw new Error(`no element with the text ${text}`);
  return found;
};

const hold = async (target: Element): Promise<void> => {
  await act(async () => {
    mouse(target, "mousedown", 10, 1);
    await new Promise((done) => setTimeout(done, 480));
    mouse(target, "mouseup", 10, 0);
  });
  await flush();
};

describe("the privacy of the page", () => {
  it("reads values from the seed file", () => {
    expect(seedValues().length).toBeGreaterThan(0);
  });

  it("has no value of the seed file in the sample items or the page", () => {
    const page = [readFileSync("index.html", "utf8"), JSON.stringify(SEED_MEDS)].join("\n").toLowerCase();
    for (const value of seedValues()) expect(page.includes(value)).toBe(false);
  });
});

describe("the diagram", () => {
  it("reads the two states and four events from the real machine", () => {
    const graph = graphOf(medMachine.config as MachineConfig);
    expect(graph.initial).toBe("compressed");
    expect(graph.states).toEqual(["compressed", "expanded"]);
    expect(graph.edges.map((edge) => [edge.from, edge.to, edge.events.join()])).toEqual([
      ["compressed", "expanded", "TOGGLE,EXPAND"],
      ["expanded", "compressed", "TOGGLE,COLLAPSE"],
    ]);
  });
});

describe("the real app in a browser document", () => {
  let root: HTMLElement;

  beforeAll(async () => {
    // jsdom has no layout. The width of the wheel comes from these two stubs.
    globalThis.ResizeObserver = class {
      private readonly callback: ResizeObserverCallback;
      constructor(callback: ResizeObserverCallback) {
        this.callback = callback;
      }
      observe(target: Element): void {
        this.callback([{ target } as ResizeObserverEntry], this as unknown as ResizeObserver);
      }
      unobserve(): void {}
      disconnect(): void {}
    } as unknown as typeof ResizeObserver;
    Object.defineProperty(HTMLElement.prototype, "offsetWidth", { configurable: true, get: () => 240 });

    root = document.body.appendChild(document.createElement("div"));
    await act(async () => {
      startPhone(root);
    });
    await flush(100);
  });

  it("draws the tiles at the first start, with no move of the clock", () => {
    expect(root.textContent).toContain("Moonfizz");
    expect(root.textContent).toContain("Zoomberry");
  });

  it("shows the invented items, with the next dose of the real schedule", async () => {
    await act(async () => {
      holdClock(600);
    });
    await flush();
    expect(root.textContent).toContain("Moonfizz8hnext2p");
    expect(root.textContent).toContain("Zoomberry24hnext8a+");
    for (const med of readMeds()) {
      const next = nextDose(med, med.offset, clockDate());
      expect(dosesInDay(med, med.offset)).toContain(next.hour);
    }
  });

  it("ends a press when the page scrolls, as the responder system of react-native-web does", async () => {
    const tile = leaf(root, "Plinkotab");
    await act(async () => {
      mouse(tile, "mousedown", 10, 1);
      document.dispatchEvent(new Event("scroll"));
      await new Promise((done) => setTimeout(done, 480));
      mouse(tile, "mouseup", 10, 0);
    });
    await flush();
    expect(stateOf("plinkotab")).toBe("compressed");
  });

  it("opens a tile on a long press, and the second tile closes the first", async () => {
    await hold(leaf(root, "Moonfizz"));
    expect(stateOf("moonfizz")).toBe("expanded");
    expect(root.textContent).toContain("Moonfizz--8h");

    await hold(leaf(root, "Sunnydrop"));
    expect(stateOf("sunnydrop")).toBe("expanded");
    expect(stateOf("moonfizz")).toBe("compressed");
    expect(expandedTiles()).toEqual(["sunnydrop"]);
    expect(steps().some((step) => step.id === "moonfizz" && step.event === "COLLAPSE" && step.byRule)).toBe(true);
  });

  it("moves the offset in the database when the wheel is dragged", async () => {
    const wheel = leaf(root, "Sunnydrop--6h").nextElementSibling!;
    const before = readMeds().find((med) => med.id === "sunnydrop")!.offset;
    await act(async () => {
      // The pan responder ignores a move with the time of the event before it.
      for (const [type, x, buttons] of [["mousedown", 100, 1], ["mousemove", 120, 1], ["mousemove", 140, 1], ["mouseup", 140, 0]] as const) {
        mouse(wheel, type, x, buttons);
        await new Promise((done) => setTimeout(done, 5));
      }
    });
    await flush();
    const after = readMeds().find((med) => med.id === "sunnydrop")!.offset;
    expect(after).toBe((before + 2) % 12);
  });

  it("shows an offset from the page in the open wheel", async () => {
    await act(async () => {
      setOffset("sunnydrop", 5);
    });
    await flush();
    expect(root.textContent).toContain("Sunnydrop--6h511");
    expect(dosesInDay(readMeds().find((med) => med.id === "sunnydrop")!, 5)).toEqual([5, 11, 17, 23]);
  });

  it("records an event with no transition", async () => {
    await act(async () => {
      sendEvent("plinkotab", "COLLAPSE");
    });
    await flush();
    expect(steps()[0]).toMatchObject({ id: "plinkotab", event: "COLLAPSE", from: "compressed", to: "compressed", byRule: false });
  });
});
