import { createStore } from '@tobilu/qmd';
import { homedir } from 'node:os';
import { join } from 'node:path';
import type { QMDStore } from '@tobilu/qmd';

const DEFAULT_DB_PATH = join(homedir(), '.qmd', 'index.sqlite');

let store: QMDStore | null = null;
let currentDbPath: string = process.env['QMD_DB_PATH'] ?? DEFAULT_DB_PATH;

export async function getStore(): Promise<QMDStore> {
  if (!store) {
    store = await createStore({ dbPath: currentDbPath });
  }
  return store;
}

export async function reopenStore(dbPath: string): Promise<void> {
  if (store) {
    await store.close();
    store = null;
  }
  currentDbPath = dbPath;
  store = await createStore({ dbPath: currentDbPath });
}

export function getCurrentDbPath(): string {
  return currentDbPath;
}
