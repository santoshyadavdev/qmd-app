import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@tobilu/qmd', () => ({
  createStore: vi.fn().mockResolvedValue({
    close: vi.fn(),
    search: vi.fn(),
  }),
}));

describe('qmd-store', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('returns the same store instance on second call', async () => {
    const { getStore } = await import('./qmd-store');
    const s1 = await getStore();
    const s2 = await getStore();
    expect(s1).toBe(s2);
  });

  it('getCurrentDbPath returns default path with .qmd/index.sqlite', async () => {
    const { getCurrentDbPath } = await import('./qmd-store');
    expect(getCurrentDbPath()).toContain('.qmd');
    expect(getCurrentDbPath()).toContain('index.sqlite');
  });

  it('reopenStore closes previous store and creates a new one', async () => {
    const { createStore } = await import('@tobilu/qmd');
    const { getStore, reopenStore, getCurrentDbPath } = await import('./qmd-store');
    await getStore();
    await reopenStore('/tmp/new.sqlite');
    expect(getCurrentDbPath()).toBe('/tmp/new.sqlite');
    expect(vi.mocked(createStore)).toHaveBeenCalledTimes(2);
  });

  it('reopenStore restores previous state on failure', async () => {
    const { createStore } = await import('@tobilu/qmd');
    const { getStore, reopenStore, getCurrentDbPath } = await import('./qmd-store');
    await getStore();
    const originalPath = getCurrentDbPath();
    vi.mocked(createStore).mockRejectedValueOnce(new Error('bad path'));
    await expect(reopenStore('/bad/path.sqlite')).rejects.toThrow('bad path');
    expect(getCurrentDbPath()).toBe(originalPath);
  });
});
