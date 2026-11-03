import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import { BROWSER_ALIASES, BROWSER_EXTENSIONS, browserApp } from "./browser-app.config.ts";

// The Pages workflow sets SITE_BASE to "/Meds". A local build uses the root.
const env = (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env ?? {};
const base = env["SITE_BASE"] ? `${env["SITE_BASE"].replace(/\/$/, "")}/` : "/";
const pkg = JSON.parse(readFileSync(fileURLToPath(new URL("../packages/app/package.json", import.meta.url)), "utf8")) as { version: string };

// The site has one page: the app in a phone frame, its state machine and its schedule. The deploy adds `status/` and `releases/`.
export default defineConfig({
  base,
  build: {
    target: "es2022",
    // The bundle is the real app and react-native-web, and the limit of the site is 1 MB.
    chunkSizeWarningLimit: 800,
    rolldownOptions: {
      // Each file of react-native-web starts with "use client". A bundle for a browser has no use for it.
      onLog(level, log, handler) {
        if (log.code !== "MODULE_LEVEL_DIRECTIVE") handler(level, log);
      },
    },
  },
  // The tsconfig of the app asks for React Native JSX. A browser needs plain calls.
  oxc: { jsx: { runtime: "automatic", importSource: "react" } },
  plugins: [browserApp()],
  resolve: { alias: [...BROWSER_ALIASES], extensions: [...BROWSER_EXTENSIONS], dedupe: ["react", "react-dom"] },
  define: {
    __DEV__: "false",
    __BUILD__: JSON.stringify({ sha: (env["GITHUB_SHA"] ?? "local").slice(0, 7), date: new Date().toISOString().slice(0, 10), version: pkg.version }),
  },
});
