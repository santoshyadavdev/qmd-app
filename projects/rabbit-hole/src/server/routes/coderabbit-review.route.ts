import { Router } from 'express';
import { basename } from 'node:path';
import { createTempGitRepo } from '../utils/temp-git-repo';
import { runCodeRabbitReview } from '../utils/cli-runner';

interface CodeRabbitReviewRouteDependencies {
  createTempGitRepo: typeof createTempGitRepo;
  runCodeRabbitReview: typeof runCodeRabbitReview;
}

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 10;

export function createCodeRabbitReviewRouter(
  dependencies: CodeRabbitReviewRouteDependencies = {
    createTempGitRepo,
    runCodeRabbitReview,
  },
): Router {
  const router = Router();
  const requestCounts = new Map<string, { count: number; resetAt: number }>();

  const isRateLimited = (ip: string): boolean => {
    const now = Date.now();
    const entry = requestCounts.get(ip);

    if (!entry || now > entry.resetAt) {
      requestCounts.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
      return false;
    }

    entry.count += 1;
    return entry.count > RATE_LIMIT_MAX;
  };

  router.post('/api/coderabbit-review', async (req, res) => {
    const apiKey = process.env['CODERABBIT_API_KEY'];
    if (!apiKey) {
      res.status(401).json({ error: 'CodeRabbit not configured' });
      return;
    }

    const clientIp = req.ip ?? req.socket.remoteAddress ?? 'unknown';
    if (isRateLimited(clientIp)) {
      res.status(429).json({ error: 'Too many requests, please wait' });
      return;
    }

    const { scenarioId, code, filename } = req.body ?? {};

    if (
      typeof scenarioId !== 'string' ||
      typeof code !== 'string' ||
      typeof filename !== 'string' ||
      !code.trim() ||
      filename !== basename(filename) ||
      !/^[\w.-]+$/.test(filename)
    ) {
      res.status(400).json({ error: 'Invalid request: scenarioId, code, and filename are required' });
      return;
    }

    let repo: Awaited<ReturnType<typeof createTempGitRepo>> | null = null;

    try {
      repo = await dependencies.createTempGitRepo(code, filename);
      const result = await dependencies.runCodeRabbitReview(repo.dir, apiKey);
      res.json(result);
    } catch (error: unknown) {
      const isTimeout =
        error instanceof Error &&
        (error.name === 'TIMEOUT' ||
          ('killed' in error && (error as { killed: boolean }).killed));

      if (isTimeout) {
        res.status(504).json({ error: 'Review timed out, try again' });
      } else {
        res.status(500).json({ error: 'Review failed' });
      }
    } finally {
      if (repo) {
        await repo.cleanup();
      }
    }
  });

  return router;
}

export const coderabbitReviewRouter = createCodeRabbitReviewRouter();
