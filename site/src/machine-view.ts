// The diagram of the state machine, with the live state lit, its event buttons and the log of the real events.
import { byId, h } from "@mark1russell7/site-pages/chrome";
import type { Med } from "@meds/app/types";
import { expandedTiles, sendEvent, stateOf, steps, type Step } from "./bridge.ts";
import type { Edge, Graph } from "./graph.ts";

const SVG = "http://www.w3.org/2000/svg";
const NODE = { width: 150, height: 64, top: 74 };
const VIEW = { width: 440, height: 210 };

function svg<K extends keyof SVGElementTagNameMap>(tag: K, attributes: Readonly<Record<string, string | number>>, ...children: readonly (Node | string)[]): SVGElementTagNameMap[K] {
  const element = document.createElementNS(SVG, tag);
  for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, String(value));
  element.append(...children);
  return element;
}

const nodeLeft = (index: number): number => 20 + index * 250;

/** This function gives the path of an edge: an arc above the boxes to the right, and an arc below them to the left. */
function edgePath(fromIndex: number, toIndex: number): { d: string; labelY: number } {
  const right = fromIndex < toIndex;
  const fromX = nodeLeft(fromIndex) + (right ? NODE.width : 0);
  const toX = nodeLeft(toIndex) + (right ? 0 : NODE.width);
  const y = NODE.top + (right ? 14 : NODE.height - 14);
  const bend = y + (right ? -62 : 62);
  return { d: `M ${fromX} ${y} C ${fromX + (right ? 40 : -40)} ${bend}, ${toX + (right ? -40 : 40)} ${bend}, ${toX} ${y}`, labelY: right ? 32 : 188 };
}

const stepText = (step: Step): string => (step.from === step.to ? `${step.from}: no transition` : `${step.from} → ${step.to}`);

export class MachineView {
  private readonly nodes = new Map<string, SVGGElement>();
  private readonly edges = new Map<Edge, SVGGElement>();
  private readonly events = byId("events");
  private focus: string | undefined;

  private readonly graph: Graph;

  constructor(graph: Graph) {
    this.graph = graph;
    byId("diagram").append(this.diagram());
    this.events.replaceChildren(...graph.events.map((event) => h("button", { type: "button", class: "chip event", "data-event": event }, event)));
    this.events.addEventListener("click", (event) => {
      const button = (event.target as HTMLElement).closest<HTMLButtonElement>("button[data-event]");
      if (button?.dataset["event"] !== undefined && this.focus !== undefined) sendEvent(this.focus, button.dataset["event"]);
    });
  }

  private diagram(): SVGSVGElement {
    const { states, edges, initial } = this.graph;
    const root = svg("svg", { viewBox: `0 0 ${VIEW.width} ${VIEW.height}`, role: "img", "aria-label": `A state machine with the states ${states.join(" and ")}` });
    root.append(svg("defs", {}, svg("marker", { id: "arrow", viewBox: "0 0 10 10", refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: "auto-start-reverse" }, svg("path", { d: "M 0 0 L 10 5 L 0 10 z", class: "arrow-head" }))));

    for (const edge of edges) {
      const path = edgePath(states.indexOf(edge.from), states.indexOf(edge.to));
      const group = svg(
        "g",
        { class: "edge", "data-from": edge.from, "data-to": edge.to },
        svg("path", { d: path.d, "marker-end": "url(#arrow)" }),
        svg("text", { x: VIEW.width / 2, y: path.labelY, "text-anchor": "middle" }, edge.events.join(" · ")),
      );
      this.edges.set(edge, group);
      root.append(group);
    }

    const startX = nodeLeft(states.indexOf(initial)) + NODE.width / 2;
    root.append(svg("g", { class: "start" }, svg("circle", { cx: startX, cy: 26, r: 5 }), svg("path", { d: `M ${startX} 31 L ${startX} ${NODE.top - 2}`, "marker-end": "url(#arrow)" })));

    states.forEach((state, index) => {
      const group = svg(
        "g",
        { class: "node", "data-state": state },
        svg("rect", { x: nodeLeft(index), y: NODE.top, width: NODE.width, height: NODE.height, rx: 14 }),
        svg("text", { x: nodeLeft(index) + NODE.width / 2, y: NODE.top + NODE.height / 2 + 6, "text-anchor": "middle" }, state),
      );
      this.nodes.set(state, group);
      root.append(group);
    });
    return root;
  }

  render(meds: readonly Med[], med: Med, last: Step | undefined): void {
    this.focus = med.id;
    const current = stateOf(med.id);
    byId("machine-name").textContent = med.name;
    for (const [state, node] of this.nodes) node.classList.toggle("lit", state === current);
    for (const [edge, group] of this.edges) {
      group.classList.toggle("fired", last !== undefined && last.id === med.id && last.from === edge.from && last.to === edge.to);
    }

    const open = expandedTiles();
    const openName = meds.find((item) => item.id === open[0])?.name;
    byId("rule").textContent = `${open.length} of ${meds.length} tiles open${openName === undefined ? "" : `: ${openName}`}. The app keeps at most one open.`;
    byId("rule").dataset["open"] = String(open.length);

    const name = (id: string): string => meds.find((item) => item.id === id)?.name ?? id;
    byId("log").replaceChildren(
      ...steps().map((step) =>
        h(
          "li",
          { "data-tile": step.id, "data-event": step.event, "data-from": step.from, "data-to": step.to, "data-rule": step.byRule },
          h("strong", {}, name(step.id)),
          " ",
          h("code", {}, step.event),
          " ",
          h("span", {}, stepText(step)),
          step.byRule ? h("em", {}, "the app sent this: one tile stays open") : null,
        ),
      ),
    );
    if (steps().length === 0) byId("log").replaceChildren(h("li", { class: "empty" }, "No events yet. Hold a tile in the phone."));
  }
}
