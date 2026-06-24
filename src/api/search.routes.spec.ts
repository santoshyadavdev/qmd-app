import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import type { QMDStore } from '@tobilu/qmd';
import { createSearchRouter } from './search.routes';

const documentsAll = vi.fn().mockReturnValue([
  { collection: 'notes', path: 'test.md', title: 'Doc Title' },
]);
const documentsPrepare = vi.fn().mockReturnValue({ all: documentsAll });

const store = {
  search: vi.fn().mockResolvedValue([
    {
      title: 'Test Doc',
      displayPath: 'notes/test.md',
      score: 0.9,
      snippet: 'test snippet',
      collection: 'notes',
      docId: '#abc123',
      context: '',
    },
  ]),
  searchLex: vi.fn().mockResolvedValue([]),
  searchVector: vi.fn().mockResolvedValue([]),
  internal: {
    db: {
      prepare: documentsPrepare,
    },
  },
  get: vi.fn().mockResolvedValue({
    title: 'Test Doc',
    displayPath: 'notes/test.md',
    docId: '#abc123',
    collection: 'notes',
  }),
  getDocumentBody: vi.fn().mockResolvedValue('# Test\nContent here'),
} as unknown as QMDStore;

let app: express.Express;

beforeEach(() => {
  vi.clearAllMocks();
  app = express();
  app.use(express.json());
  app.use('/api', createSearchRouter(async () => store));
});

describe('GET /api/search', () => {
  it('returns results for a query', async () => {
    const res = await request(app).get('/api/search?q=test&mode=hybrid');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].title).toBe('Test Doc');
    expect(store.search).toHaveBeenCalledTimes(1);
  });

  it('returns 400 when q is missing', async () => {
    const res = await request(app).get('/api/search');
    expect(res.status).toBe(400);
  });
});

describe('GET /api/documents', () => {
  it('returns active documents', async () => {
    const res = await request(app).get('/api/documents');
    expect(res.status).toBe(200);
    expect(documentsPrepare).toHaveBeenCalledWith(
      'SELECT collection, path, title FROM documents WHERE active=1'
    );
    expect(documentsAll).toHaveBeenCalledTimes(1);
    expect(res.body).toEqual([
      {
        title: 'Doc Title',
        displayPath: 'notes/test.md',
        collection: 'notes',
        docId: '',
      },
    ]);
  });
});

describe('GET /api/get', () => {
  it('returns a document by path', async () => {
    const res = await request(app).get('/api/get?path=notes%2Ftest.md');
    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Test Doc');
  });

  it('returns 400 when path is missing', async () => {
    const res = await request(app).get('/api/get');
    expect(res.status).toBe(400);
  });
});
