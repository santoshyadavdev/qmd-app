import { Router } from 'express';
import { getStore } from './qmd-store.js';
import type { SearchResultItem, ApiError } from './types.js';

export function createSearchRouter(loadStore: typeof getStore = getStore): Router {
  const router = Router();

  router.get('/search', async (req, res) => {
    const q = req.query['q'] as string | undefined;
    const mode = (req.query['mode'] as string) ?? 'hybrid';
    const collection = req.query['collection'] as string | undefined;

    if (!q) {
      res.status(400).json({ error: 'q parameter is required' } satisfies ApiError);
      return;
    }

    try {
      const store = await loadStore();
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

  router.get('/documents', async (req, res) => {
    const collection = req.query['collection'] as string | undefined;
    try {
      const store = await loadStore();
      const db = (store as any).internal?.db;
      if (!db) {
        res.status(500).json({ error: 'Store DB not accessible' } satisfies ApiError);
        return;
      }
      const sql = collection
        ? 'SELECT collection, path, title FROM documents WHERE active=1 AND collection=?'
        : 'SELECT collection, path, title FROM documents WHERE active=1';
      const rows: { collection: string; path: string; title: string }[] = collection
        ? db.prepare(sql).all(collection)
        : db.prepare(sql).all();
      const results = rows.map((r: any) => ({
        title: r.title || r.path,
        displayPath: r.collection ? `${r.collection}/${r.path}` : r.path,
        collection: r.collection ?? '',
        docId: '',
      }));
      res.json(results);
    } catch (err) {
      res.status(500).json({ error: String(err) } satisfies ApiError);
    }
  });


  router.get('/get', async (req, res) => {
    const path = req.query['path'] as string | undefined;

    if (!path) {
      res.status(400).json({ error: 'path parameter is required' } satisfies ApiError);
      return;
    }

    try {
      const store = await loadStore();
      const doc = await store.get(path, { includeBody: true });
      if (doc && 'error' in doc) {
        res.status(404).json({ error: (doc as any).error } satisfies ApiError);
        return;
      }
      // getDocumentBody returns the raw markdown body
      const body = await store.getDocumentBody(path).catch(() => null);
      res.json({ ...doc, body });
    } catch (err) {
      res.status(500).json({ error: String(err) } satisfies ApiError);
    }
  });

  return router;
}

export const searchRouter = createSearchRouter();
