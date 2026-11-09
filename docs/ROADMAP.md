# Roadmap

This file is the plan of Meds. The Status page of the site reads it.

| ID | Item | Status | Summary |
| --- | --- | --- | --- |
| M1 | The tiles and the hour wheel | done | Each item has a tile with its next dose. A long press opens a wheel that moves the hours of the doses. |
| M2 | One open tile | done | A state machine holds the state of each tile. A registry keeps at most one tile open. |
| M3 | The site with the real app | in progress | The site at GitHub Pages runs the app with invented sample items in a phone frame. |
| M4 | Keep the hours after a restart | not started | The app loads its list again at each start, so a moved hour goes back at the next start. |
| M5 | Record a dose | not started | The app shows the next dose. It has no record of a dose that a person takes. |
| M6 | Expo SDK 58 | not started | The app uses Expo SDK 54 (September 2025). Expo supports only its newest SDKs, and the SDK 54 tools need overrides for security fixes. The target date is 2026-11-22. |
