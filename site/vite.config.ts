import { siteShell } from "@mark1russell7/site-pages/vite";
import { defineConfig } from "vite";
import { BROWSER_ALIASES, BROWSER_EXTENSIONS, browserApp } from "./browser-app.config.ts";

// The site has one page: the app in a phone frame, its state machine and its schedule. The deploy adds `status/` and `releases/`.
export default defineConfig({
  build: {
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
  plugins: [siteShell({ themeKey: "meds-theme", packageFile: "../packages/app/package.json" }), browserApp()],
  resolve: { alias: [...BROWSER_ALIASES], extensions: [...BROWSER_EXTENSIONS], dedupe: ["react", "react-dom"] },
  define: {
    __DEV__: "false",
  },
});
