import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@tobilu/qmd', () => ({
  createStore: vi.fn().mockResolvedValue({
    close: vi.fn(),
    search: vi.fn(),
  }),
}));

describe('qmd-store', () => {
  beforeEach(async () => {
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
});
