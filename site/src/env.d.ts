/** The version of the app, the commit and the date of the build. Vite writes it at build time. */
declare const __BUILD__: { readonly sha: string; readonly date: string; readonly version: string };

/** The package has no types. The stand-in for `react-native` passes it on. */
declare module "react-native-web";
