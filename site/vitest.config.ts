import { defineConfig } from "vitest/config";
import { BROWSER_ALIASES, BROWSER_EXTENSIONS, browserApp } from "./browser-app.config.ts";
// The tests start the real app in jsdom, with the same stand-ins as the page.
export default defineConfig({
  oxc: { jsx: { runtime: "automatic", importSource: "react" } },
  plugins: [browserApp()],
  resolve: { alias: [...BROWSER_ALIASES], extensions: [...BROWSER_EXTENSIONS], dedupe: ["react", "react-dom"], mainFields: ["module", "main"], noExternal: [/react-native-safe-area-context/, /react-native-web/, /async-storage/] },
  define: { __DEV__: "false" },
  test: {
    include: ["src/**/*.test.ts"],
    pool: "forks",
    maxWorkers: 1,
  },
});
