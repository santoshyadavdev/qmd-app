import { Router } from 'express';
import { getStore } from './qmd-store.js';
import type { ApiError } from './types.js';

export function createCollectionsRouter(loadStore: typeof getStore = getStore): Router {
  const router = Router();

  router.get('/collections', async (_req, res) => {
    try {
      const store = await loadStore();
      const collections = await store.listCollections();
      res.json(collections);
    } catch (err) {
      res.status(500).json({ error: String(err) } satisfies ApiError);
    }
  });

  router.post('/collections', async (req, res) => {
    const { name, path } = req.body as { name?: string; path?: string };

    if (!name || !path) {
      res.status(400).json({ error: 'name and path are required' } satisfies ApiError);
      return;
    }

    try {
      const store = await loadStore();
      await store.addCollection(name, { path });
      res.status(201).json({ name });
    } catch (err) {
      res.status(500).json({ error: String(err) } satisfies ApiError);
    }
  });

  router.patch('/collections/:name', async (req, res) => {
    const oldName = req.params['name'];
    const { newName } = req.body as { newName?: string };

    if (!newName) {
      res.status(400).json({ error: 'newName is required' } satisfies ApiError);
      return;
    }

    try {
      const store = await loadStore();
      await store.renameCollection(oldName, newName);
      res.json({ name: newName });
    } catch (err) {
      res.status(500).json({ error: String(err) } satisfies ApiError);
    }
  });

  router.delete('/collections/:name', async (req, res) => {
    const name = req.params['name'];

    try {
      const store = await loadStore();
      await store.removeCollection(name);
      res.status(204).send();
    } catch (err) {
      res.status(500).json({ error: String(err) } satisfies ApiError);
    }
  });

  return router;
}

export const collectionsRouter = createCollectionsRouter();
