# Desktop testing

This guide is for players testing the Electron build and developers preparing
desktop release candidates.

## What the desktop build runs

The desktop app packages the Vite client from `dist/public/` and loads it with
Electron through the private `heavy-water://game` protocol. It does not boot the
Express server.

Desktop mode currently supports:

| Feature | Desktop status |
|---|---|
| Campaign play | Supported |
| Local save/load | Supported through Electron local storage |
| Keyboard/mouse | Supported |
| Gamepad | Supported through the browser Gamepad API |
| Auth, cloud saves, leaderboard | Web/server build only |
| Multiplayer rooms and Versus | Web/server build only |

Because `/api/*` and `/ws` are intentionally offline in Electron, desktop
campaign testing does not require PostgreSQL, `DATABASE_URL`, or
`SESSION_SECRET`.

## Tester quick start

From a fresh checkout:

```bash
npm install
npm run desktop
```

`npm run desktop` builds the app and opens Electron. For a faster relaunch after
you already have a fresh `dist/` folder:

```bash
npm run desktop:preview
```

To verify the desktop shell without keeping a window open:

```bash
npm run desktop:smoke
```

The smoke script builds the app, starts Electron hidden, verifies the preload
bridge and React root initialized, then exits.

## Manual desktop smoke checklist

Run this before handing a build to another tester:

- `npm run check` passes.
- `npm run build` passes.
- `npm run desktop:smoke` passes.
- `npm run desktop` opens the main menu without a login prompt.
- Main menu shows campaign/customize/guide options, and does not show Versus.
- `START MISSION` enters the world and pointer lock works after clicking.
- Audio starts after the first click or key press.
- `TAB` opens upgrades, `M` opens the map, and `ESC` pauses.
- Pick up or spend something, return to menu or relaunch, and confirm the local
  save summary updates.
- If available, connect a controller and verify menu navigation plus jump/fire.

## Packaging checks

Directory package:

```bash
npm run desktop:pack
```

Installer/release package for the host platform:

```bash
npm run desktop:release
```

Platform-specific commands:

```bash
npm run desktop:release:mac
npm run desktop:release:win
npm run desktop:release:linux
```

Release output goes to `release/`. Open the packaged app, repeat the manual
smoke checklist, and confirm assets load from the packaged app rather than the
dev server.

## Developer notes

- Electron entry point: [`electron/main.cjs`](../electron/main.cjs)
- Preload bridge: [`electron/preload.cjs`](../electron/preload.cjs)
- Local launcher wrapper: [`script/run-electron.cjs`](../script/run-electron.cjs)
- Desktop runtime detection: [`ProgressSync.ts`](../client/src/game/ProgressSync.ts)
- Desktop scripts and builder config: [`package.json`](../package.json)
- Static client output: `dist/public/`

The desktop app uses `window.heavyWaterDesktop.isDesktop` to choose local saves
and skip web auth. Keep desktop-only behavior behind that runtime check so the
browser/server build keeps cloud saves and multiplayer.

## Troubleshooting

- If `npm run desktop:preview` opens a blank window, run `npm run build` first.
- If assets are missing only in packaged builds, confirm they live under
  `client/public/` or are imported by the Vite bundle.
- If the login screen appears in Electron, check that `electron/preload.cjs` is
  loaded and `window.heavyWaterDesktop.isDesktop` is true.
- If multiplayer testing is needed, use `npm run dev` and open
  `http://localhost:5000`; the offline desktop shell does not host `/ws`.
