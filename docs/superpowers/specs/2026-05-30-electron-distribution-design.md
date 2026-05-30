# Electron Distribution — Design Spec
**Date:** 2026-05-30  
**Project:** qmd-app  
**Status:** Approved

---

## Overview

Wrap the existing Angular + Express qmd-app as a cross-platform Electron desktop app, distributable via `.dmg` (macOS), `.exe` installer (Windows), and `.AppImage` (Linux). The Express server runs as a child process inside Electron; the Angular UI is unchanged.

---

## Architecture

```
Electron main process (electron/main.ts)
  ├── Reads QMD DB path from userData/qmd-config.json (or default ~/.qmd/)
  ├── On first launch: opens native folder picker dialog → saves to qmd-config.json
  ├── Spawns dist/qmd-app/server/server.mjs as child_process on a random free port
  ├── Polls http://localhost:<port>/api/status until server is ready (max 10s)
  ├── Creates BrowserWindow → loads http://localhost:<port>
  └── On app quit: kills child process

BrowserWindow
  └── Loads Angular app at http://localhost:<port> — no changes needed

electron/preload.ts
  └── contextBridge exposes window.electronAPI.selectFolder() for DB path picker

electron-builder.yml
  └── Targets: dmg (macOS), nsis (Windows), AppImage (Linux)
  └── Bundles: dist/qmd-app/, node_modules, electron binaries
```

---

## Components

### `electron/main.ts`
- Uses `app.getPath('userData')` to store `qmd-config.json`
- On startup: reads config; if `dbPath` missing, calls `dialog.showOpenDialog` for folder selection
- Spawns `server.mjs` with `child_process.fork()` passing `QMD_DB_PATH` via env
- Finds a free port using a helper (tries ports 4000–4099)
- Polls `/api/status` every 500ms; shows BrowserWindow once ready
- Handles `app.on('before-quit')` to kill child process cleanly

### `electron/preload.ts`
- Exposes minimal IPC surface: `window.electronAPI.selectFolder()` → triggers `dialog.showOpenDialog` in main, returns selected path
- Used by Settings page to let users change DB folder after first launch

### `tsconfig.electron.json`
- Compiles `electron/` to `dist/electron/` with `module: commonjs`, `target: ES2022`
- Separate from Angular's tsconfig

### `electron-builder.yml`
```yaml
appId: dev.santosh.qmd-app
productName: QMD
directories:
  output: dist/electron-dist
files:
  - dist/qmd-app/**
  - dist/electron/main.js
  - dist/electron/preload.js
  - node_modules/**
  - package.json
mac:
  target: dmg
  category: public.app-category.productivity
win:
  target: nsis
linux:
  target: AppImage
```

### `package.json` changes
New scripts:
- `electron:compile` — `tsc -p tsconfig.electron.json`
- `electron:dev` — builds Angular, compiles Electron, runs `electron .` (dev mode, loads from dist)
- `electron:dist` — full build → `electron-builder --mac --win --linux`
- `electron:dist:mac` — macOS only (for local development)

New devDependencies:
- `electron` (latest stable, e.g. v34)
- `electron-builder`
- `concurrently` (for `electron:dev` parallel tasks if needed)

---

## First Launch Flow

1. User opens app for first time
2. If `userData/qmd-config.json` doesn't exist or `dbPath` is not set:
   - Show `dialog.showOpenDialog` asking user to select a folder for the QMD database
   - Write `{ dbPath: "<selected>/index.sqlite" }` to `qmd-config.json`
3. Start Express server with that `QMD_DB_PATH`
4. App loads normally; Settings page shows current DB path with a "Change" button

---

## Settings Page Update

Add a "Database Location" section to the Settings page:
- Shows current DB path (read from `/api/status`)
- "Change folder" button → calls `window.electronAPI.selectFolder()` → posts new path to `/api/settings/db-path` → restarts server with new path

This section renders only when `window.electronAPI` exists (i.e., inside Electron), not in browser dev mode.

---

## Error Handling

- **Server fails to start:** Show an Electron error dialog, then quit
- **Server takes >10s to start:** Show error dialog ("QMD server timed out")
- **Child process crashes mid-session:** Show a notification + reload button in BrowserWindow
- **No folder selected on first launch:** Quit app with a message ("QMD requires a database folder to start")

---

## Build Output

```
dist/
  qmd-app/          ← Angular SSR build (unchanged)
  electron/         ← compiled Electron main + preload
  electron-dist/    ← packaged installers
    QMD-1.0.0.dmg
    QMD Setup 1.0.0.exe
    QMD-1.0.0.AppImage
```

---

## Out of Scope

- Auto-update (electron-updater) — can be added later
- Code signing / notarization — required for distribution outside direct download; deferred
- System tray / background mode — not needed for v1
- Native file associations for `.md` files — deferred
