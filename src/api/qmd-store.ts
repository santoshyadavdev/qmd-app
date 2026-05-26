import { createStore } from '@tobilu/qmd';
import { homedir } from 'node:os';
import { join } from 'node:path';
import type { QMDStore } from '@tobilu/qmd';

const DEFAULT_DB_PATH = join(homedir(), '.qmd', 'index.sqlite');

let store: QMDStore | null = null;
let currentDbPath: string = process.env['QMD_DB_PATH'] ?? DEFAULT_DB_PATH;

export async function getStore(): Promise<QMDStore> {
  if (!store) {
    try {
      store = await createStore({ dbPath: currentDbPath });
    } catch (error) {
      throw new Error(
        `Failed to initialize QMD store at ${currentDbPath}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
  return store;
}

export async function reopenStore(dbPath: string): Promise<void> {
  const previousDbPath = currentDbPath;
  const previousStore = store;
  try {
    if (store) {
      await store.close();
      store = null;
    }
    currentDbPath = dbPath;
    store = await createStore({ dbPath: currentDbPath });
  } catch (error) {
    store = previousStore;
    currentDbPath = previousDbPath;
    throw new Error(
      `Failed to reopen store at ${dbPath}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

export function getCurrentDbPath(): string {
  return currentDbPath;
}
