import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

vi.mock('./qmd-store', () => ({
  getStore: vi.fn().mockResolvedValue({
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
    get: vi.fn().mockResolvedValue({
      title: 'Test Doc',
      displayPath: 'notes/test.md',
      body: '# Test\nContent here',
      docId: '#abc123',
      collection: 'notes',
    }),
  }),
}));

const { searchRouter } = await import('./search.routes');
const app = express();
app.use(express.json());
app.use('/api', searchRouter);

describe('GET /api/search', () => {
  it('returns results for a query', async () => {
    const res = await request(app).get('/api/search?q=test&mode=hybrid');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].title).toBe('Test Doc');
  });

  it('returns 400 when q is missing', async () => {
    const res = await request(app).get('/api/search');
    expect(res.status).toBe(400);
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
