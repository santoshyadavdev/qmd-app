import { Router } from 'express';
import { getStore, getCurrentDbPath, reopenStore } from './qmd-store.js';
import type { AppStatus, ApiError } from './types.js';

export const settingsRouter = Router();

settingsRouter.get('/status', async (_req, res) => {
  try {
    const store = await getStore();
    const collections = await store.listCollections();
    const totalDocs = collections.reduce((sum, c) => sum + (c.doc_count ?? 0), 0);
    const embeddedDocs = collections.reduce((sum, c) => sum + (c.active_count ?? 0), 0);

    const status: AppStatus = {
      dbPath: getCurrentDbPath(),
      totalDocs,
      embeddedDocs,
      collections: collections.map((c) => ({
        ...c,
        last_modified: c.last_modified ? Number(c.last_modified) : 0,
      })),
      modelLoaded: true,
    };
    res.json(status);
  } catch (err) {
    res.status(500).json({ error: String(err) } satisfies ApiError);
  }
});

settingsRouter.put('/settings/db-path', async (req, res) => {
  const { dbPath } = req.body as { dbPath?: string };

  if (!dbPath) {
    res.status(400).json({ error: 'dbPath is required' } satisfies ApiError);
    return;
  }

  try {
    await reopenStore(dbPath);
    res.json({ dbPath });
  } catch (err) {
    res.status(500).json({ error: String(err) } satisfies ApiError);
  }
});
