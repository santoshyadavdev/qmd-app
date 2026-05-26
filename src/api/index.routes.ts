import { Router } from 'express';
import { getStore } from './qmd-store.js';
import type { ProgressUpdate, IndexResult, EmbedResult, ApiError } from './types.js';

export const indexRouter = Router();

function sseHeaders(res: import('express').Response): void {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();
}

function sendEvent(res: import('express').Response, data: unknown): void {
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

indexRouter.get('/index/update', async (req, res) => {
  const collection = req.query['collection'] as string | undefined;
  sseHeaders(res);

  try {
    const store = await getStore();
    const result = await store.update({
      collections: collection ? [collection] : undefined,
      onProgress: (p) => {
        const update: ProgressUpdate = { collection: p.collection, file: p.file, current: p.current, total: p.total };
        sendEvent(res, update);
      },
    });
    const done: IndexResult = {
      done: true,
      indexed: result.indexed,
      updated: result.updated,
      unchanged: result.unchanged,
      removed: result.removed,
    };
    sendEvent(res, done);
    res.end();
  } catch (err) {
    sendEvent(res, { error: String(err) } satisfies ApiError);
    res.end();
  }
});

indexRouter.get('/index/embed', async (req, res) => {
  const collection = req.query['collection'] as string | undefined;
  sseHeaders(res);

  try {
    const store = await getStore();
    const result = await store.embed({
      collection: collection ?? undefined,
      onProgress: (p) => {
        // EmbedProgress has chunksEmbedded/totalChunks (no per-file info)
        const update: ProgressUpdate = {
          collection: collection ?? '',
          file: '',
          current: p.chunksEmbedded,
          total: p.totalChunks,
        };
        sendEvent(res, update);
      },
    });
    const done: EmbedResult = { done: true, embedded: result.docsProcessed };
    sendEvent(res, done);
    res.end();
  } catch (err) {
    sendEvent(res, { error: String(err) } satisfies ApiError);
    res.end();
  }
});
