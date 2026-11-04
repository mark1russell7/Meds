# Meds

Meds is a phone app that shows when each dose is next. It is made with Expo and React Native.

Try the real app in your browser at <https://mark1russell7.github.io/Meds/>. The site uses invented sample items, and it is not medical advice.

## The app

- Each item has a tile with its name, its interval and its next dose.
- A long press opens a tile. The drag of a wheel moves the hours of the doses.
- The app keeps at most one tile open.
- The app shows the time of the next dose. It does not record a dose that you take.

## The repository

| Folder | What it holds |
| --- | --- |
| `packages/app` | The Expo app. |
| `site` | The site of GitHub Pages. It builds `packages/app` with `react-native-web`. |
| `docs/ROADMAP.md` | The plan. The Status page of the site reads it. |

## Commands

Start these commands at the root of the repository.

```sh
pnpm install
pnpm --filter @meds/app start
pnpm --filter @meds/site dev
```
