import { Router } from 'express';
import { getStore } from './qmd-store.js';
import type { SearchResultItem, ApiError } from './types.js';

export const searchRouter = Router();

searchRouter.get('/search', async (req, res) => {
  const q = req.query['q'] as string | undefined;
  const mode = (req.query['mode'] as string) ?? 'hybrid';
  const collection = req.query['collection'] as string | undefined;

  if (!q) {
    res.status(400).json({ error: 'q parameter is required' } satisfies ApiError);
    return;
  }

  try {
    const store = await getStore();
    let rawResults;

    if (mode === 'keyword') {
      rawResults = await store.searchLex(q, { limit: 20, collection });
    } else if (mode === 'semantic') {
      rawResults = await store.searchVector(q, { limit: 20, collection });
    } else {
      // Hybrid requires a local LLM; fall back to keyword with a 3s timeout
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('hybrid timeout')), 3000)
      );
      try {
        rawResults = await Promise.race([
          store.search({ query: q, collection, limit: 20 }),
          timeout,
        ]);
      } catch {
        rawResults = await store.searchLex(q, { limit: 20, collection });
      }
    }

    const results: SearchResultItem[] = rawResults.map((r: any) => ({
      title: r.title ?? r.displayPath,
      displayPath: r.displayPath,
      collection: r.collection ?? '',
      snippet: r.snippet ?? '',
      score: Math.round((r.score ?? 0) * 100),
      docId: r.docId ?? '',
      context: r.context ?? '',
    }));

    res.json(results);
  } catch (err) {
    res.status(500).json({ error: String(err) } satisfies ApiError);
  }
});

searchRouter.get('/get', async (req, res) => {
  const path = req.query['path'] as string | undefined;

  if (!path) {
    res.status(400).json({ error: 'path parameter is required' } satisfies ApiError);
    return;
  }

  try {
    const store = await getStore();
    const doc = await store.get(path);
    if (doc && 'error' in doc) {
      res.status(404).json({ error: (doc as any).error } satisfies ApiError);
      return;
    }
    res.json(doc);
  } catch (err) {
    res.status(500).json({ error: String(err) } satisfies ApiError);
  }
});
