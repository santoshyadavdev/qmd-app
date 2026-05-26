import { Router } from 'express';
import { getStore } from './qmd-store.js';
import type { ApiError } from './types.js';

export const contextRouter = Router();

contextRouter.get('/context', async (_req, res) => {
  try {
    const store = await getStore();
    const contexts = await store.listContexts();
    res.json(contexts);
  } catch (err) {
    res.status(500).json({ error: String(err) } satisfies ApiError);
  }
});

contextRouter.post('/context', async (req, res) => {
  const { collection, path, context } = req.body as { collection?: string; path?: string; context?: string };

  if (!collection || !path || !context) {
    res.status(400).json({ error: 'collection, path, and context are required' } satisfies ApiError);
    return;
  }

  try {
    const store = await getStore();
    await store.addContext(collection, path, context);
    res.status(201).json({ collection, path, context });
  } catch (err) {
    res.status(500).json({ error: String(err) } satisfies ApiError);
  }
});

contextRouter.delete('/context', async (req, res) => {
  const { collection, path } = req.query as { collection?: string; path?: string };

  if (!collection || !path) {
    res.status(400).json({ error: 'collection and path query params are required' } satisfies ApiError);
    return;
  }

  try {
    const store = await getStore();
    await store.removeContext(collection, path);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: String(err) } satisfies ApiError);
  }
});

contextRouter.put('/context/global', async (req, res) => {
  const { context } = req.body as { context?: string };

  try {
    const store = await getStore();
    await store.setGlobalContext(context ?? undefined);
    res.json({ context: context ?? null });
  } catch (err) {
    res.status(500).json({ error: String(err) } satisfies ApiError);
  }
});
