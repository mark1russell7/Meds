/**
 * This module is `react-native-web` with one change. The app reads the size of the window to size its tiles, and in
 * this page the window of the app is the screen of the phone frame.
 */
export * from "react-native-web";

export const SCREEN = { width: 320, height: 690, scale: 1, fontScale: 1 } as const;

export function useWindowDimensions(): typeof SCREEN {
  return SCREEN;
}
