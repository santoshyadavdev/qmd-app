# Electron Distribution Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Package the existing Angular + Express qmd-app as a cross-platform Electron desktop app distributable as .dmg / .exe / .AppImage.

**Architecture:** Electron main process finds a free port, spawns `dist/qmd-app/server/server.mjs` as a Node child process passing `PORT` and `QMD_DB_PATH` env vars, polls until the server is ready, then opens a BrowserWindow at `http://localhost:<port>`. On first launch a native folder-picker sets the DB path, saved to `userData/qmd-config.json`. electron-builder packages everything.

**Tech Stack:** Electron v34, electron-builder, TypeScript (CJS target for Electron files), existing Angular 21 + Express SSR build.

---

## File Map

| Action | Path | Purpose |
|--------|------|---------|
| Create | `electron/main.ts` | Main process: port discovery, child spawn, BrowserWindow, lifecycle |
| Create | `electron/preload.ts` | contextBridge: exposes `window.electronAPI.selectFolder()` |
| Create | `tsconfig.electron.json` | Compiles `electron/` → `dist/electron/` as CommonJS |
| Create | `electron-builder.yml` | Packaging config for mac/win/linux |
| Create | `src/electron.d.ts` | Global type for `window.electronAPI` |
| Modify | `package.json` | Add `main`, new scripts, new devDeps |
| Modify | `src/app/pages/settings/settings.component.ts` | Add "Change Folder" section (Electron-only) |
| Modify | `src/app/services/qmd.service.ts` | Add `updateDbPath()` method |

---

## Task 1: Install Electron dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install devDependencies**

```bash
cd /Users/santosh/qmd-app
npm install --save-dev electron@34 electron-builder
```

Expected: both packages appear under `devDependencies` in `package.json`. No build errors.

- [ ] **Step 2: Verify install**

```bash
npx electron --version
```

Expected output: `v34.x.x`

---

## Task 2: Create TypeScript config for Electron

**Files:**
- Create: `tsconfig.electron.json`

- [ ] **Step 1: Create the file**

Create `/Users/santosh/qmd-app/tsconfig.electron.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "moduleResolution": "node",
    "outDir": "dist/electron",
    "rootDir": "electron",
    "strict": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "resolveJsonModule": true
  },
  "include": ["electron/**/*.ts"]
}
```

- [ ] **Step 2: Verify it parses** (no electron/ files yet, just check syntax)

```bash
cd /Users/santosh/qmd-app && npx tsc -p tsconfig.electron.json --listFiles 2>&1 | head -5
```

Expected: prints nothing or "No inputs were found" (that's fine — electron/ dir doesn't exist yet).

---

## Task 3: Create electron/preload.ts

**Files:**
- Create: `electron/preload.ts`

- [ ] **Step 1: Create the file**

```bash
mkdir -p /Users/santosh/qmd-app/electron
```

Create `/Users/santosh/qmd-app/electron/preload.ts`:

```typescript
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  selectFolder: (): Promise<string | null> =>
    ipcRenderer.invoke('select-folder'),
});
```

- [ ] **Step 2: Create global type declaration**

Create `/Users/santosh/qmd-app/src/electron.d.ts`:

```typescript
interface Window {
  electronAPI?: {
    selectFolder(): Promise<string | null>;
  };
}
```

---

## Task 4: Create electron/main.ts

**Files:**
- Create: `electron/main.ts`

This is the core of the Electron integration. Key points:
- Uses `net.createServer` to find a free port in range 4000–4099
- Spawns `server.mjs` with `child_process.spawn(process.execPath, [serverPath])`  
- When **packaged** (asar), server.mjs lives in `app.asar.unpacked/` — handled by the `app.isPackaged` check
- Polls `/api/status` every 500ms (max 10s) before creating the window
- `ipcMain.handle('select-folder')` responds to preload's `ipcRenderer.invoke`

- [ ] **Step 1: Create the file**

Create `/Users/santosh/qmd-app/electron/main.ts`:

```typescript
import { app, BrowserWindow, dialog, ipcMain } from 'electron';
import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import * as net from 'net';
import * as http from 'http';

let mainWindow: BrowserWindow | null = null;
let serverProcess: ChildProcess | null = null;
let serverPort = 4000;

// ─── Config helpers ──────────────────────────────────────────────────────────

function configPath(): string {
  return path.join(app.getPath('userData'), 'qmd-config.json');
}

function readConfig(): { dbPath?: string } {
  try {
    return JSON.parse(fs.readFileSync(configPath(), 'utf-8'));
  } catch {
    return {};
  }
}

function writeConfig(config: { dbPath: string }): void {
  fs.mkdirSync(path.dirname(configPath()), { recursive: true });
  fs.writeFileSync(configPath(), JSON.stringify(config, null, 2));
}

// ─── Port discovery ──────────────────────────────────────────────────────────

function findFreePort(start: number, end: number): Promise<number> {
  return new Promise((resolve, reject) => {
    const tryPort = (port: number) => {
      if (port > end) {
        reject(new Error(`No free port found between ${start} and ${end}`));
        return;
      }
      const server = net.createServer();
      server.once('error', () => tryPort(port + 1));
      server.once('listening', () => server.close(() => resolve(port)));
      server.listen(port);
    };
    tryPort(start);
  });
}

// ─── Server readiness poll ───────────────────────────────────────────────────

function pollServerReady(port: number, maxMs: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + maxMs;
    const check = () => {
      if (Date.now() > deadline) {
        reject(new Error('QMD server timed out after 10 seconds'));
        return;
      }
      const req = http.get(`http://localhost:${port}/api/status`, (res) => {
        if (res.statusCode === 200) resolve();
        else setTimeout(check, 500);
      });
      req.on('error', () => setTimeout(check, 500));
      req.end();
    };
    check();
  });
}

// ─── DB path selection ───────────────────────────────────────────────────────

async function getOrPickDbPath(): Promise<string | null> {
  const config = readConfig();
  if (config.dbPath) return config.dbPath;

  const result = await dialog.showOpenDialog({
    title: 'Select QMD Database Folder',
    message: 'Choose a folder where QMD will store its search index.',
    buttonLabel: 'Use This Folder',
    properties: ['openDirectory', 'createDirectory'],
  });

  if (result.canceled || result.filePaths.length === 0) return null;

  const dbPath = path.join(result.filePaths[0], 'index.sqlite');
  writeConfig({ dbPath });
  return dbPath;
}

// ─── Server spawn ────────────────────────────────────────────────────────────

function startServer(port: number, dbPath: string): ChildProcess {
  // In packaged app, server.mjs is in app.asar.unpacked (asarUnpack config)
  const serverPath = app.isPackaged
    ? path.join(
        process.resourcesPath,
        'app.asar.unpacked',
        'dist',
        'qmd-app',
        'server',
        'server.mjs',
      )
    : path.join(app.getAppPath(), 'dist', 'qmd-app', 'server', 'server.mjs');

  const child = spawn(process.execPath, [serverPath], {
    env: {
      ...process.env,
      PORT: String(port),
      QMD_DB_PATH: dbPath,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  child.stdout?.on('data', (d: Buffer) =>
    console.log('[server]', d.toString().trim()),
  );
  child.stderr?.on('data', (d: Buffer) =>
    console.error('[server]', d.toString().trim()),
  );

  child.on('exit', (code) => {
    if (code !== 0 && mainWindow) {
      mainWindow.webContents.executeJavaScript(
        `document.body.innerHTML = '<div style="font-family:sans-serif;padding:40px;color:#f87171">' +
          '<h2>QMD server crashed</h2><p>Exit code: ${code}</p>' +
          '<button onclick="location.reload()">Reload</button></div>'`,
      );
    }
  });

  return child;
}

// ─── Window ──────────────────────────────────────────────────────────────────

function createWindow(port: number): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadURL(`http://localhost:${port}`);
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ─── App lifecycle ───────────────────────────────────────────────────────────

app.whenReady().then(async () => {
  // IPC: folder picker (also used by Settings page after first launch)
  ipcMain.handle('select-folder', async () => {
    const result = await dialog.showOpenDialog(mainWindow ?? undefined!, {
      properties: ['openDirectory', 'createDirectory'],
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    const dbPath = path.join(result.filePaths[0], 'index.sqlite');
    writeConfig({ dbPath });
    return dbPath;
  });

  try {
    const dbPath = await getOrPickDbPath();
    if (!dbPath) {
      dialog.showErrorBox(
        'QMD',
        'A database folder is required to start QMD.',
      );
      app.quit();
      return;
    }

    // Ensure the directory for the db exists
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });

    serverPort = await findFreePort(4000, 4099);
    serverProcess = startServer(serverPort, dbPath);

    await pollServerReady(serverPort, 10000);
    createWindow(serverPort);
  } catch (err) {
    dialog.showErrorBox('QMD startup error', String(err));
    serverProcess?.kill();
    app.quit();
  }
});

app.on('before-quit', () => {
  serverProcess?.kill();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (mainWindow === null) createWindow(serverPort);
});
```

- [ ] **Step 2: Compile Electron files**

```bash
cd /Users/santosh/qmd-app && npx tsc -p tsconfig.electron.json
```

Expected: creates `dist/electron/main.js` and `dist/electron/preload.js` with no errors.

- [ ] **Step 3: Commit**

```bash
cd /Users/santosh/qmd-app
git add electron/ src/electron.d.ts tsconfig.electron.json
git commit -m "feat(electron): add main process, preload, and tsconfig"
```

---

## Task 5: Update package.json

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Add `main` entry and new scripts**

Edit `package.json` — add the `"main"` field at the top level, and extend the `"scripts"` block:

```json
{
  "name": "qmd-app",
  "version": "1.0.0",
  "main": "dist/electron/main.js",
  "scripts": {
    "ng": "ng",
    "start": "ng serve",
    "build": "ng build",
    "watch": "ng build --watch --configuration development",
    "test": "ng test",
    "serve:ssr:qmd-app": "node dist/qmd-app/server/server.mjs",
    "electron:compile": "tsc -p tsconfig.electron.json",
    "electron:dev": "npm run build && npm run electron:compile && npx electron .",
    "electron:dist:mac": "npm run build && npm run electron:compile && npx electron-builder --mac",
    "electron:dist:win": "npm run build && npm run electron:compile && npx electron-builder --win",
    "electron:dist:linux": "npm run build && npm run electron:compile && npx electron-builder --linux",
    "electron:dist": "npm run build && npm run electron:compile && npx electron-builder --mac --win --linux"
  }
}
```

(Keep all existing `"dependencies"` and `"devDependencies"` fields unchanged.)

- [ ] **Step 2: Verify `package.json` is valid JSON**

```bash
cd /Users/santosh/qmd-app && node -e "require('./package.json')" && echo "valid"
```

Expected: `valid`

---

## Task 6: Create electron-builder.yml

**Files:**
- Create: `electron-builder.yml`

Key notes:
- `asarUnpack` is critical: `better-sqlite3` has native bindings and `server.mjs` spawns as a child process — both must be outside the asar archive so Node can load/execute them.
- `npmRebuild: true` tells electron-builder to recompile native modules (better-sqlite3) for the target Electron version.

- [ ] **Step 1: Create the file**

Create `/Users/santosh/qmd-app/electron-builder.yml`:

```yaml
appId: dev.santosh.qmd-app
productName: QMD
copyright: Copyright © 2026 Santosh Yadav

directories:
  output: dist/electron-dist
  buildResources: build

files:
  - dist/qmd-app/**
  - dist/electron/main.js
  - dist/electron/preload.js
  - node_modules/**
  - package.json

asarUnpack:
  - dist/qmd-app/server/**
  - node_modules/better-sqlite3/**
  - node_modules/@tobilu/qmd/**

npmRebuild: true

mac:
  target:
    - target: dmg
      arch:
        - x64
        - arm64
  category: public.app-category.productivity

win:
  target:
    - target: nsis
      arch:
        - x64

linux:
  target:
    - target: AppImage
      arch:
        - x64

nsis:
  oneClick: false
  allowToChangeInstallationDirectory: true
```

- [ ] **Step 2: Commit**

```bash
cd /Users/santosh/qmd-app
git add electron-builder.yml package.json
git commit -m "feat(electron): add electron-builder config and npm scripts"
```

---

## Task 7: Update QmdService with updateDbPath()

**Files:**
- Modify: `src/app/services/qmd.service.ts`

- [ ] **Step 1: Add the method**

Open `src/app/services/qmd.service.ts` and add after the existing `getDocument()` method:

```typescript
async updateDbPath(dbPath: string): Promise<void> {
  await firstValueFrom(this.http.put('/api/settings/db-path', { dbPath }));
}
```

(`firstValueFrom` and `this.http` are already imported/injected in the file.)

- [ ] **Step 2: Build to verify no TypeScript errors**

```bash
cd /Users/santosh/qmd-app && npm run build 2>&1 | grep -E "error|complete" | grep -v "satisfies" | tail -5
```

Expected: `Application bundle generation complete.`

---

## Task 8: Update Settings component for Electron DB picker

**Files:**
- Modify: `src/app/pages/settings/settings.component.ts`

The Settings page already has a text-input for DB path. We add:
1. An `isElectron` signal that detects `window.electronAPI`
2. A `dbFolder` computed that strips `/index.sqlite` from the DB path for display
3. A `chooseFolder()` method that calls `window.electronAPI.selectFolder()`, then calls `updateDbPath()` and reloads status
4. A new template section visible only in Electron

- [ ] **Step 1: Add isElectron signal and chooseFolder method**

In `src/app/pages/settings/settings.component.ts`, add these members to the component class (alongside the existing `dbPathInput`, etc.):

```typescript
readonly isElectron = signal(
  typeof window !== 'undefined' && !!(window as any).electronAPI,
);

readonly dbFolder = computed(() => {
  const p = this.qmd.status()?.dbPath ?? '';
  return p ? p.replace(/[/\\]index\.sqlite$/, '') : '—';
});

async chooseFolder(): Promise<void> {
  const newPath = await (window as any).electronAPI.selectFolder();
  if (!newPath) return;
  try {
    await this.qmd.updateDbPath(newPath);
    await this.qmd.loadStatus();
    this.toast.success('Database folder updated. Restart the app to use the new location.');
  } catch {
    this.toast.error('Failed to update database folder');
  }
}
```

- [ ] **Step 2: Add Electron-only section to the template**

In the component `template`, find the existing `<section aria-labelledby="db-section">` block and add the following block **before** it:

```html
@if (isElectron()) {
  <section aria-labelledby="db-folder-section">
    <h2 id="db-folder-section">Database Folder</h2>
    <div class="card">
      <div class="row">
        <span class="label">Current folder</span>
        <span class="value">{{ dbFolder() }}</span>
      </div>
      <button class="btn btn-primary" (click)="chooseFolder()">
        Change Folder…
      </button>
    </div>
  </section>
}
```

- [ ] **Step 3: Build to verify**

```bash
cd /Users/santosh/qmd-app && npm run build 2>&1 | grep -E "error|complete" | grep -v "satisfies" | tail -5
```

Expected: `Application bundle generation complete.`

- [ ] **Step 4: Commit**

```bash
cd /Users/santosh/qmd-app
git add src/app/services/qmd.service.ts src/app/pages/settings/settings.component.ts src/electron.d.ts
git commit -m "feat(electron): add DB folder picker to Settings page"
```

---

## Task 9: Test Electron in dev mode

**Files:** (none — verification only)

- [ ] **Step 1: Compile Electron files**

```bash
cd /Users/santosh/qmd-app && npm run electron:compile
```

Expected: `dist/electron/main.js` and `dist/electron/preload.js` created with no errors.

- [ ] **Step 2: Run Electron dev**

```bash
cd /Users/santosh/qmd-app && npm run electron:dev
```

Expected: 
1. Angular builds (may take ~30s)  
2. Electron compiles
3. Electron window opens, folder-picker appears on first launch (or app loads directly if `~/.qmd/index.sqlite` exists from previous dev work)
4. App loads at `http://localhost:400x` in the window
5. Search and Documents pages work

- [ ] **Step 3: Verify Settings page in Electron**

In the running Electron app, navigate to Settings. Confirm:
- "Database Folder" section appears (only in Electron)
- "Change Folder…" button opens a native folder-picker dialog

---

## Task 10: Build distributable (macOS)

**Files:** (none — build output only)

- [ ] **Step 1: Build the macOS DMG**

```bash
cd /Users/santosh/qmd-app && npm run electron:dist:mac
```

Expected (~2–5 min):
- Rebuilds native modules for Electron
- Creates `dist/electron-dist/QMD-1.0.0.dmg` and `dist/electron-dist/QMD-1.0.0-arm64.dmg`

- [ ] **Step 2: Test the DMG**

```bash
open dist/electron-dist/QMD-1.0.0*.dmg
```

Drag QMD to Applications. Open it. Verify:
- Folder picker appears on first launch
- App loads and search works
- No "server timed out" errors

- [ ] **Step 3: Add dist/electron-dist to .gitignore**

```bash
echo "dist/electron-dist/" >> /Users/santosh/qmd-app/.gitignore
echo "dist/electron/" >> /Users/santosh/qmd-app/.gitignore
git add .gitignore
```

- [ ] **Step 4: Push all commits**

```bash
cd /Users/santosh/qmd-app && git push origin main
```

---

## Notes for Windows / Linux builds

Building `.exe` and `.AppImage` on macOS requires either:
- A CI/CD pipeline (GitHub Actions) with `electron-builder` targeting `--win` and `--linux`
- Or running `npm run electron:dist:win` / `npm run electron:dist:linux` on a Windows/Linux machine

A GitHub Actions workflow for cross-platform builds can be added later.
