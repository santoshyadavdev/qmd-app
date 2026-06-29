import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const CLI_TIMEOUT_MS = 30_000;

export interface CliReviewComment {
  line: number;
  message: string;
  severity: string;
}

export interface CliReviewResult {
  comments: CliReviewComment[];
  summary: string;
}

export async function runCodeRabbitReview(
  repoDir: string,
  apiKey: string,
): Promise<CliReviewResult> {
  const env = {
    ...process.env,
    CODERABBIT_API_KEY: apiKey,
  };

  try {
    const { stdout } = await execFileAsync(
      'npx',
      ['@coderabbitai/coderabbit', 'review', '--json'],
      {
        cwd: repoDir,
        env,
        timeout: CLI_TIMEOUT_MS,
        maxBuffer: 10 * 1024 * 1024,
      },
    );

    return parseCliOutput(stdout);
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      'killed' in error &&
      (error as { killed: boolean }).killed
    ) {
      const timeoutErr = new Error('CLI review timed out');
      timeoutErr.name = 'TIMEOUT';
      throw timeoutErr;
    }
    throw error;
  }
}

function parseCliOutput(stdout: string): CliReviewResult {
  try {
    const parsed = JSON.parse(stdout);

    if (Array.isArray(parsed.comments)) {
      return {
        comments: parsed.comments.map((c: Record<string, unknown>) => ({
          line: typeof c['line'] === 'number' ? c['line'] : 0,
          message: typeof c['message'] === 'string' ? c['message'] : '',
          severity: typeof c['severity'] === 'string' ? c['severity'] : 'info',
        })),
        summary:
          typeof parsed.summary === 'string'
            ? parsed.summary
            : 'Review complete.',
      };
    }

    return { comments: [], summary: stdout.trim() || 'Review complete.' };
  } catch {
    return {
      comments: [],
      summary: stdout.trim() || 'Review complete (unable to parse structured output).',
    };
  }
}
