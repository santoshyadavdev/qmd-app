import express from 'express';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CliReviewResult } from '../utils/cli-runner';
import type { TempGitRepo } from '../utils/temp-git-repo';
import { createCodeRabbitReviewRouter } from './coderabbit-review.route';

const createApp = (
  createTempGitRepo: (code: string, filename: string) => Promise<TempGitRepo>,
  runCodeRabbitReview: (repoDir: string, apiKey: string) => Promise<CliReviewResult>,
) => {
  const app = express();
  app.set('trust proxy', true);
  app.use(express.json());
  app.use(
    createCodeRabbitReviewRouter({
      createTempGitRepo,
      runCodeRabbitReview,
    }),
  );
  return app;
};

const validPayload = {
  scenarioId: 'stale-state',
  code: 'const x = 1;',
  filename: 'demo.ts',
};

let ipCounter = 0;
const nextIp = () => `203.0.113.${(ipCounter += 1)}`;

describe('coderabbitReviewRouter', () => {
  const originalApiKey = process.env['CODERABBIT_API_KEY'];
  let mockedCreateTempGitRepo: ReturnType<
    typeof vi.fn<(code: string, filename: string) => Promise<TempGitRepo>>
  >;
  let mockedRunCodeRabbitReview: ReturnType<
    typeof vi.fn<(repoDir: string, apiKey: string) => Promise<CliReviewResult>>
  >;

  beforeEach(() => {
    vi.resetAllMocks();
    mockedCreateTempGitRepo = vi.fn<(code: string, filename: string) => Promise<TempGitRepo>>();
    mockedRunCodeRabbitReview = vi.fn<
      (repoDir: string, apiKey: string) => Promise<CliReviewResult>
    >();
  });

  afterEach(() => {
    if (originalApiKey) {
      process.env['CODERABBIT_API_KEY'] = originalApiKey;
    } else {
      delete process.env['CODERABBIT_API_KEY'];
    }
  });

  it('returns 401 when CodeRabbit is not configured', async () => {
    delete process.env['CODERABBIT_API_KEY'];

    const response = await request(
      createApp(mockedCreateTempGitRepo, mockedRunCodeRabbitReview),
    )
      .post('/api/coderabbit-review')
      .send(validPayload);

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: 'CodeRabbit not configured' });
  });

  it('returns 400 when the request payload is invalid', async () => {
    process.env['CODERABBIT_API_KEY'] = 'test-key';

    const response = await request(
      createApp(mockedCreateTempGitRepo, mockedRunCodeRabbitReview),
    )
      .post('/api/coderabbit-review')
      .send({
        scenarioId: 'stale-state',
        code: '   ',
        filename: 'demo.ts',
      });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: 'Invalid request: scenarioId, code, and filename are required',
    });
  });

  it('returns the CLI review result and cleans up the temp repo', async () => {
    process.env['CODERABBIT_API_KEY'] = 'test-key';

    const cleanup = vi.fn().mockResolvedValue(undefined);
    mockedCreateTempGitRepo.mockResolvedValue({
      dir: '/repo',
      filePath: '/repo/demo.ts',
      cleanup,
    });
    mockedRunCodeRabbitReview.mockResolvedValue({
      comments: [{ line: 2, message: 'Use immutable updates', severity: 'warning' }],
      summary: 'Found 1 issue.',
    });

    const response = await request(createApp(mockedCreateTempGitRepo, mockedRunCodeRabbitReview))
      .post('/api/coderabbit-review')
      .set('X-Forwarded-For', nextIp())
      .send(validPayload);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      comments: [{ line: 2, message: 'Use immutable updates', severity: 'warning' }],
      summary: 'Found 1 issue.',
    });
    expect(mockedCreateTempGitRepo).toHaveBeenCalledWith('const x = 1;', 'demo.ts');
    expect(mockedRunCodeRabbitReview).toHaveBeenCalledWith('/repo', 'test-key');
    expect(cleanup).toHaveBeenCalledTimes(1);
  });

  it('returns 504 when the review command times out', async () => {
    process.env['CODERABBIT_API_KEY'] = 'test-key';

    const cleanup = vi.fn().mockResolvedValue(undefined);
    mockedCreateTempGitRepo.mockResolvedValue({
      dir: '/repo',
      filePath: '/repo/demo.ts',
      cleanup,
    });
    const timeoutError = new Error('CLI review timed out');
    timeoutError.name = 'TIMEOUT';
    mockedRunCodeRabbitReview.mockRejectedValue(timeoutError);

    const response = await request(createApp(mockedCreateTempGitRepo, mockedRunCodeRabbitReview))
      .post('/api/coderabbit-review')
      .set('X-Forwarded-For', nextIp())
      .send(validPayload);

    expect(response.status).toBe(504);
    expect(response.body).toEqual({ error: 'Review timed out, try again' });
    expect(cleanup).toHaveBeenCalledTimes(1);
  });

  it('returns 429 after more than ten requests in one minute from the same IP', async () => {
    process.env['CODERABBIT_API_KEY'] = 'test-key';

    mockedCreateTempGitRepo.mockResolvedValue({
      dir: '/repo',
      filePath: '/repo/demo.ts',
      cleanup: vi.fn().mockResolvedValue(undefined),
    });
    mockedRunCodeRabbitReview.mockResolvedValue({
      comments: [],
      summary: 'Review complete.',
    });

    const app = createApp(mockedCreateTempGitRepo, mockedRunCodeRabbitReview);
    const clientIp = nextIp();

    for (let attempt = 0; attempt < 10; attempt += 1) {
      const response = await request(app)
        .post('/api/coderabbit-review')
        .set('X-Forwarded-For', clientIp)
        .send(validPayload);

      expect(response.status).toBe(200);
    }

    const response = await request(app)
      .post('/api/coderabbit-review')
      .set('X-Forwarded-For', clientIp)
      .send(validPayload);

    expect(response.status).toBe(429);
    expect(response.body).toEqual({ error: 'Too many requests, please wait' });
  });
});
