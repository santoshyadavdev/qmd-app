import { describe, it, expect, vi } from 'vitest';
import { beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import type { QMDStore } from '@tobilu/qmd';
import { createCollectionsRouter } from './collections.routes';

const store = {
  listCollections: vi.fn().mockResolvedValue([
    { name: 'notes', pwd: '/home/user/notes', glob_pattern: '**/*.md', doc_count: 10, active_count: 10, last_modified: null, includeByDefault: true },
  ]),
  addCollection: vi.fn().mockResolvedValue(undefined),
  removeCollection: vi.fn().mockResolvedValue(undefined),
  renameCollection: vi.fn().mockResolvedValue(undefined),
} as unknown as QMDStore;

let app: express.Express;

beforeEach(() => {
  app = express();
  app.use(express.json());
  app.use('/api', createCollectionsRouter(async () => store));
});

describe('GET /api/collections', () => {
  it('returns list of collections', async () => {
    const res = await request(app).get('/api/collections');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].name).toBe('notes');
  });
});

describe('POST /api/collections', () => {
  it('adds a collection and returns 201', async () => {
    const res = await request(app)
      .post('/api/collections')
      .send({ name: 'docs', path: '/home/user/docs' });
    expect(res.status).toBe(201);
  });

  it('returns 400 when name or path missing', async () => {
    const res = await request(app).post('/api/collections').send({ name: 'docs' });
    expect(res.status).toBe(400);
  });
});

describe('PATCH /api/collections/:name', () => {
  it('renames a collection and returns new name', async () => {
    const res = await request(app)
      .patch('/api/collections/notes')
      .send({ newName: 'journal' });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('journal');
  });

  it('returns 400 when newName is missing', async () => {
    const res = await request(app).patch('/api/collections/notes').send({});
    expect(res.status).toBe(400);
  });
});

describe('DELETE /api/collections/:name', () => {
  it('removes a collection and returns 204', async () => {
    const res = await request(app).delete('/api/collections/notes');
    expect(res.status).toBe(204);
  });
});
