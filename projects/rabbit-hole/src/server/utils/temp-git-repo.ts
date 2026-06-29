import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { tmpdir } from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export interface TempGitRepo {
  dir: string;
  filePath: string;
  cleanup: () => Promise<void>;
}

export async function createTempGitRepo(
  code: string,
  filename: string,
): Promise<TempGitRepo> {
  const safeName = basename(filename);
  if (!safeName || safeName !== filename || safeName.includes('..')) {
    throw new Error('Invalid filename');
  }

  const dir = await mkdtemp(join(tmpdir(), 'coderabbit-review-'));
  const filePath = join(dir, safeName);

  await execFileAsync('git', ['init'], { cwd: dir });
  await execFileAsync('git', ['commit', '--allow-empty', '-m', 'initial'], {
    cwd: dir,
  });
  await writeFile(filePath, code, 'utf-8');
  await execFileAsync('git', ['add', safeName], { cwd: dir });

  const cleanup = async () => {
    await rm(dir, { recursive: true, force: true }).catch(() => {});
  };

  return { dir, filePath, cleanup };
}
