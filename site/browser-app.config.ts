/**
 * The build settings that put the real app of `packages/app` into a browser page. `vite.config.ts` and the test
 * configuration use them. No file of `packages/app` changes: each stand-in replaces one import at build time.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { Plugin } from "vite";

const here = (path: string): string => fileURLToPath(new URL(path, import.meta.url));
const unix = (path: string): string => path.split("?")[0]!.replaceAll("\\", "/");

const SEED_FILE = here("../packages/app/seed.ts");

/** The imports of the app that a page file replaces: the exact specifier and the file of the app that imports it. */
const REDIRECTS: readonly { readonly source: string; readonly importer: string; readonly to: string }[] = [
  // The invented sample items replace the list of the repository.
  { source: "../seed", importer: "/packages/app/lib/medsCollection.ts", to: here("src/stand-ins/seed.ts") },
  // A clock that the page can move replaces the wall clock.
  { source: "./lib/useClock", importer: "/packages/app/App.tsx", to: here("src/stand-ins/useClock.ts") },
  // The same createActor of XState, and it also reports each actor to the page.
  { source: "xstate", importer: "/packages/app/lib/useMedRegistry.ts", to: here("src/stand-ins/xstate.ts") },
];

/** The aliases of the packages for a phone. A web build of Metro has the same exchange of `react-native`. */
export const BROWSER_ALIASES: readonly { readonly find: RegExp; readonly replacement: string }[] = [
  { find: /^react-native$/, replacement: here("src/stand-ins/react-native.ts") },
  { find: /^expo-haptics$/, replacement: here("src/stand-ins/expo-haptics.ts") },
  { find: /^expo-glass-effect$/, replacement: here("src/stand-ins/expo-glass-effect.ts") },
  { find: /^expo-status-bar$/, replacement: here("src/stand-ins/expo-status-bar.ts") },
];

/** A `.web` file of a package goes before its file for a phone, as in a web build of Metro. */
export const BROWSER_EXTENSIONS: readonly string[] = [".web.tsx", ".web.ts", ".web.js", ".mjs", ".js", ".mts", ".ts", ".jsx", ".tsx", ".json"];

/** This function gives the ids and the names of the seed file, so that the check names no value in the source. */
export function seedValues(text: string = readFileSync(SEED_FILE, "utf8")): string[] {
  return [...text.matchAll(/\b(?:id|name):\s*'([^']+)'/g)].map((match) => match[1]!.toLowerCase());
}

/** This plugin applies the redirects. It stops a build that loads the seed file, or that has a value of the seed file. */
export function browserApp(): Plugin {
  return {
    name: "meds-browser-app",
    enforce: "pre",
    resolveId(source, importer) {
      if (importer === undefined) return null;
      const from = unix(importer);
      return REDIRECTS.find((redirect) => redirect.source === source && from.endsWith(redirect.importer))?.to ?? null;
    },
    load(id) {
      if (unix(id) === unix(SEED_FILE)) this.error("The page must not load packages/app/seed.ts.");
      return null;
    },
    generateBundle(_options, bundle) {
      const values = seedValues();
      if (values.length === 0) this.error("The check found no values in packages/app/seed.ts.");
      for (const file of Object.values(bundle)) {
        const text = (file.type === "chunk" ? file.code : String(file.source)).toLowerCase();
        for (const value of values) if (text.includes(value)) this.error(`${file.fileName} holds a value of packages/app/seed.ts.`);
      }
    },
  };
}
