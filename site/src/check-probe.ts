/**
 * The probe of the page. The site check of the Pages workflow starts it in a browser before the deploy, and a failed
 * check stops the deploy. It drives the real app with mouse events, as a visitor does, and it reads the results.
 *
 * The site check reads this TypeScript file directly. It removes the types and the `export` line, and it starts the
 * result as the body of an async function.
 */

// The site check gives these helpers to the probe. Each element of this page is an HTML element.
declare const check: (name: string, ok: unknown, detail?: unknown) => boolean;
declare const until: <T>(fn: () => T | Promise<T>, ms?: number) => Promise<T>;
declare const wait: (ms: number) => Promise<void>;
declare const $: (selector: string) => HTMLElement | null;
declare const $$: (selector: string) => HTMLElement[];
declare const type: (target: string | Element, text: string) => void;
declare const click: (target: string | Element) => void;

const NAMES = ["Moonfizz", "Wobblemint", "Sunnydrop", "Plinkotab", "Zoomberry"];

const phone = () => $("#app-root")?.textContent ?? "";
const text = (selector: string) => $(selector)?.textContent ?? "";
const leaf = (label: string) => $$("#app-root div").find((element) => element.children.length === 0 && element.textContent === label);
const lit = () => $(".node.lit")?.dataset["state"] ?? "";
const dots = (id: string) => $$(`.row[data-med="${id}"] .dose`).map((dose) => dose.dataset["hour"]).join();
const kindOf = (id: string, hour: number) => $(`.row[data-med="${id}"] .dose[data-hour="${hour}"]`)?.dataset["kind"];
const chipState = (id: string) => $(`#tiles [data-tile="${id}"]`)?.dataset["state"];
const newest = () => $("#log li")?.dataset ?? {};
const stored = () => JSON.parse(localStorage.getItem("@meds/collection/meds") ?? "[]") as { id: string; name: string; offset: number }[];

const mouse = (target: Element, kind: string, x: number, y: number, buttons: number) => {
  target.dispatchEvent(new MouseEvent(kind, { bubbles: true, cancelable: true, clientX: x, clientY: y, button: 0, buttons }));
};

/**
 * This function brings an element to the middle of the screen and waits until the page is still, as a visitor does
 * before a press. react-native-web ends a press when the page scrolls. On a narrow page the clock is below the phone, so
 * `type` focuses the slider and starts a smooth scroll to it. The scroll of the window does not touch the phone screen.
 */
const settle = async (target: Element) => {
  const box = target.getBoundingClientRect();
  window.scrollTo({ top: scrollY + box.y + box.height / 2 - innerHeight / 2, behavior: "instant" });
  await until(async () => {
    const y = scrollY;
    await wait(150);
    return y === scrollY;
  });
};

/** This function presses an element, holds it and lets it go. It also asserts that the page stays still during the press. */
const hold = async (target: Element, ms: number) => {
  await settle(target);
  let scrolls = 0;
  const count = () => {
    scrolls += 1;
  };
  window.addEventListener("scroll", count, true);
  const box = target.getBoundingClientRect();
  mouse(target, "mousedown", box.x + 4, box.y + 4, 1);
  await wait(ms);
  mouse(target, "mouseup", box.x + 4, box.y + 4, 0);
  window.removeEventListener("scroll", count, true);
  check(`the page stays still during the press on ${target.textContent?.slice(0, 16)}`, scrolls === 0, scrolls);
};

/**
 * This function gives each part of the app that passes the edge of the phone screen. The dot grid of the app is 2 px
 * empty boxes, and it draws one more column and one more row than the screen holds, on a phone too. The screen clips
 * those dots, so a dot is not a part.
 */
const pastTheScreen = () => {
  const edge = $(".phone-screen")!.getBoundingClientRect();
  return $$("#app-root *")
    .filter((part) => {
      const box = part.getBoundingClientRect();
      const dot = part.children.length === 0 && part.textContent === "" && box.width <= 2 && box.height <= 2;
      return !dot && (box.left < edge.left - 0.5 || box.top < edge.top - 0.5 || box.right > edge.right + 0.5 || box.bottom > edge.bottom + 0.5);
    })
    .map((part) => `${part.textContent?.slice(0, 20)} ${Math.round(part.getBoundingClientRect().right - edge.left)}x${Math.round(part.getBoundingClientRect().bottom - edge.top)}`);
};

/** This function drags an element sideways in steps. The pan responder ignores a move with the time of the event before it. */
const drag = async (target: Element, dx: number) => {
  const box = target.getBoundingClientRect();
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  mouse(target, "mousedown", x, y, 1);
  for (const part of [0.25, 0.5, 0.75, 1]) {
    await wait(30);
    mouse(target, "mousemove", x + dx * part, y, 1);
  }
  await wait(30);
  mouse(target, "mouseup", x + dx, y, 0);
};

check("the real app shows each invented item", await until(() => NAMES.every((name) => phone().includes(name))), phone());
check("the page has a chip for each item", $$("#tiles button").length === NAMES.length, $$("#tiles button").length);
check("the page says that the names are invented", text("#notice").includes("invented") && text("#notice").includes("not medical advice"), text("#notice"));
check("the machine has no event before a visitor acts", $("#log li.empty") !== null, text("#log"));

type("#clock", "600");
check("the clock moves to 10:00a", await until(() => text("#clock-label") === "10:00a"), text("#clock-label"));
check("a tile shows the next dose of the schedule", await until(() => phone().includes("Moonfizz8hnext2p")), phone());
check("a tile marks a dose of tomorrow with a plus", phone().includes("Zoomberry24hnext8a+"), phone());
check("the panel shows the same next dose", text("#next-dose") === "2p", text("#next-dose"));

type("#clock", "1410");
check("late in the day, the next dose is tomorrow", await until(() => phone().includes("Moonfizz8hnext6a+")), phone());
check("the day marks that dose as tomorrow", kindOf("moonfizz", 6) === "tomorrow", kindOf("moonfizz", 6));
type("#clock", "600");
await until(() => phone().includes("Moonfizz8hnext2p"));

check("the day shows each dose of the schedule", dots("moonfizz") === "6,14,22", dots("moonfizz"));
check("the day marks the next dose", kindOf("moonfizz", 14) === "next" && kindOf("moonfizz", 6) === "past" && kindOf("moonfizz", 22) === "later", dots("moonfizz"));
const line = Number.parseFloat($('.row[data-med="moonfizz"] .now')?.style.left ?? "");
check("the line of the day follows the clock", Math.abs(line - (10 / 24) * 100) < 0.01, line);

click("#jump");
check("the jump moves the clock to the dose", await until(() => text("#clock-label") === "2:00p"), text("#clock-label"));
check("the jump gives the following dose", await until(() => text("#next-dose") === "10p" && phone().includes("Moonfizz8hnext10p")), `${text("#next-dose")} ${phone()}`);

check("the diagram has the states of the real machine", $$(".node").map((node) => node.dataset["state"]).join() === "compressed,expanded", $$(".node").length);
check("the diagram has two edges and three events", $$(".edge").length === 2 && $$("#events button").length === 3, `${$$(".edge").length} ${$$("#events button").length}`);
check("the machine starts compressed", lit() === "compressed", lit());

await hold(leaf("Moonfizz")!, 520);
check("a long press opens the tile in the app", await until(() => phone().includes("Moonfizz--8h")), phone());
check("the diagram lights the new state", await until(() => lit() === "expanded"), lit());
check("the diagram marks the edge that fired", $(".edge.fired")?.dataset["from"] === "compressed", $(".edge.fired")?.dataset["from"]);
check("the log has the real event", newest()["event"] === "TOGGLE" && newest()["to"] === "expanded", JSON.stringify(newest()));

await hold(leaf("Sunnydrop")!, 520);
check("a second tile opens", await until(() => phone().includes("Sunnydrop--6h")), phone());
check("the app closes the first tile", await until(() => chipState("moonfizz") === "compressed" && chipState("sunnydrop") === "expanded"), chipState("moonfizz"));
check("the app stays at one open tile", text("#rule").startsWith("1 of 5"), text("#rule"));
check("the log shows that the app sent COLLAPSE", $('#log li[data-tile="moonfizz"][data-event="COLLAPSE"] em') !== null, text("#log"));
check("the open tile fits the screen of the phone", pastTheScreen().length === 0, pastTheScreen().join());
check("the panels follow the open tile", text("#machine-name") === "Sunnydrop" && text("#focus-name") === "Sunnydrop", text("#machine-name"));

check("the item starts at its sample hours", dots("sunnydrop") === "2,8,14,20", dots("sunnydrop"));
const wheel = leaf("Sunnydrop--6h")?.nextElementSibling as HTMLElement;
await drag(wheel, (wheel.getBoundingClientRect().width * 2) / 12);
check("a drag of the wheel moves the doses by two hours", await until(() => dots("sunnydrop") === "4,10,16,22"), dots("sunnydrop"));
check("the database holds the new offset", await until(() => stored().find((med) => med.id === "sunnydrop")?.offset === 4), JSON.stringify(stored()));
check("the panel shows the new doses", text("#doses") === "4a, 10a, 4p, 10p", text("#doses"));

click("#hour-up");
check("the hour button moves the doses", await until(() => dots("sunnydrop") === "5,11,17,23"), dots("sunnydrop"));
check("the wheel in the app follows the button", await until(() => phone().includes("Sunnydrop--6h511")), phone());

await hold(wheel, 650);
check("a long press on the wheel closes the tile", await until(() => chipState("sunnydrop") === "compressed" && text("#rule").startsWith("0 of 5")), text("#rule"));
check("the closed tile keeps the new hour", await until(() => phone().includes("Sunnydrop6hnext")), phone());

click('#events [data-event="EXPAND"]');
check("an event from the page opens the tile in the app", await until(() => lit() === "expanded" && phone().includes("Sunnydrop--6h")), lit());
click('#events [data-event="COLLAPSE"]');
check("the COLLAPSE event closes the tile", await until(() => lit() === "compressed"), lit());
click('#events [data-event="COLLAPSE"]');
check("the machine ignores an event with no transition", await until(() => newest()["from"] === "compressed" && newest()["to"] === "compressed"), JSON.stringify(newest()));

click('#tiles [data-tile="zoomberry"]');
check("a chip selects a tile for the panels", await until(() => text("#focus-name") === "Zoomberry"), text("#focus-name"));
check("an item with one dose has a ring of 24 hours", text("#doses") === "8a", text("#doses"));

click("#real-time");
check("the real time button gives the clock back", await until(() => ($("#real-time") as HTMLButtonElement).disabled), text("#clock-label"));

check("the browser stores only the sample items", stored().map((med) => med.name).join() === NAMES.join(), JSON.stringify(stored()));
const foreign = performance.getEntriesByType("resource").filter((entry) => !entry.name.startsWith(location.origin) && !entry.name.startsWith("data:"));
check("the page asks no other site for anything", foreign.length === 0, foreign.map((entry) => entry.name).join());

const theme = $("#theme");
const before = theme?.textContent;
click("#theme");
check("the theme button changes the theme", await until(() => $("#theme")?.textContent !== before), before);

// A card can clip a wide child with no overflow of the page, so these steps measure each wide view against its box.
for (const selector of ["#controls", "#machine", ".diagram", ".day", ".rows", "#log", ".how .card", ".notice"]) {
  const box = $(selector);
  check(`${selector} fits its box`, box !== null && box.scrollWidth <= box.clientWidth, `${box?.scrollWidth} in ${box?.clientWidth}`);
}
const frame = $(".phone")?.getBoundingClientRect();
check("the phone frame fits the screen", frame !== undefined && frame.left >= 0 && frame.right <= document.documentElement.clientWidth, `${frame?.left} to ${frame?.right}`);
check("the app fits the screen of the phone", pastTheScreen().length === 0, pastTheScreen().join());
check("the phone screen holds the app at its full size", $("#app-root")?.clientWidth === 320 && $("#app-root")?.clientHeight === 690, `${$("#app-root")?.clientWidth}x${$("#app-root")?.clientHeight}`);

export {};
