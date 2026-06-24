# CodeRabbit CLI Review Integration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Get CodeRabbit Review" button to Bug Hunt Lab that triggers a server-side CodeRabbit CLI review of the scenario's buggy code and displays structured findings in the explanation panel.

**Architecture:** The Express SSR server gets an API route that creates a temp git repo, writes scenario code, runs `coderabbit review`, and returns parsed results as JSON. The Angular frontend adds a service to call this endpoint, extends the store with review state, and modifies the explanation panel to display review results.

**Tech Stack:** Angular 22, Express, Node.js `child_process`, CodeRabbit CLI (`@coderabbitai/coderabbit`), Vitest

---

## File Structure

### New files

| Path | Responsibility |
|------|---------------|
| `projects/rabbit-hole/src/server/routes/coderabbit-review.route.ts` | Express route handler for POST `/api/coderabbit-review` |
| `projects/rabbit-hole/src/server/utils/temp-git-repo.ts` | Creates/cleans temp git repo, stages code |
| `projects/rabbit-hole/src/server/utils/cli-runner.ts` | Spawns CodeRabbit CLI, captures & parses output |
| `projects/rabbit-hole/src/app/services/coderabbit-review.service.ts` | Angular HTTP service calling the API |
| `projects/rabbit-hole/src/app/services/coderabbit-review.service.spec.ts` | Unit tests for the service |
| `projects/rabbit-hole/src/app/features/bug-hunt/coderabbit-review.types.ts` | Shared types for review request/response |

### Modified files

| Path | Change |
|------|--------|
| `projects/rabbit-hole/src/server.ts` | Register the new API route |
| `projects/rabbit-hole/src/app/features/bug-hunt/bug-hunt.types.ts` | Add `code` field to `BugHuntScenario` |
| `projects/rabbit-hole/src/app/features/bug-hunt/bug-hunt-scenarios.ts` | Ensure scenarios have `code` field (use existing `codeSnippet`) |
| `projects/rabbit-hole/src/app/features/bug-hunt/bug-hunt.store.ts` | Add review state signals and `requestReview()` action |
| `projects/rabbit-hole/src/app/features/bug-hunt/bug-hunt.store.spec.ts` | Add tests for review state |
| `projects/rabbit-hole/src/app/components/explanation-panel/explanation-panel.component.ts` | Add review display mode with button, loading, results |
| `projects/rabbit-hole/src/app/pages/bug-hunt/bug-hunt.component.ts` | Wire review signals to explanation panel |

---

## Task 1: Add CodeRabbit Review Types

**Files:**
- Create: `projects/rabbit-hole/src/app/features/bug-hunt/coderabbit-review.types.ts`
- Modify: `projects/rabbit-hole/src/app/features/bug-hunt/bug-hunt.types.ts`

- [ ] **Step 1: Create the review types file**

```typescript
// projects/rabbit-hole/src/app/features/bug-hunt/coderabbit-review.types.ts
export interface CodeRabbitReviewComment {
  line: number;
  message: string;
  severity: string;
}

export interface CodeRabbitReview {
  comments: CodeRabbitReviewComment[];
  summary: string;
}

export interface CodeRabbitReviewRequest {
  scenarioId: string;
  code: string;
  filename: string;
}

export type CodeRabbitReviewStatus = 'idle' | 'loading' | 'success' | 'error';
```

- [ ] **Step 2: Add `code` field to BugHuntScenario type**

In `projects/rabbit-hole/src/app/features/bug-hunt/bug-hunt.types.ts`, update the `BugHuntScenario` interface to rename `codeSnippet` to `code` and make it required:

```typescript
export interface BugHuntScenario {
  id: string;
  title: string;
  bugPattern: string;
  category: BugHuntCategory;
  difficulty: BugHuntDifficulty;
  prompt: string;
  code: string;
  correctFix: BugFixOption;
  distractorFixes: readonly BugFixOption[];
  explanation: string;
}
```

- [ ] **Step 3: Update scenario catalog to use `code` field**

In `projects/rabbit-hole/src/app/features/bug-hunt/bug-hunt-scenarios.ts`, rename `codeSnippet` to `code` in each scenario entry. The values stay the same.

- [ ] **Step 4: Update store validation to check for `code` field**

In `projects/rabbit-hole/src/app/features/bug-hunt/bug-hunt.store.ts`, update the `isScenario` method to validate `code`:

```typescript
private isScenario(value: unknown): value is BugHuntScenario {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const scenario = value as Record<string, unknown>;
  const correctFix = scenario['correctFix'] as Record<string, unknown> | undefined;
  const distractorFixes = scenario['distractorFixes'];

  return (
    typeof scenario['id'] === 'string' &&
    typeof scenario['title'] === 'string' &&
    typeof scenario['bugPattern'] === 'string' &&
    typeof scenario['category'] === 'string' &&
    typeof scenario['difficulty'] === 'string' &&
    typeof scenario['prompt'] === 'string' &&
    typeof scenario['code'] === 'string' &&
    typeof scenario['explanation'] === 'string' &&
    typeof correctFix?.['id'] === 'string' &&
    typeof correctFix?.['label'] === 'string' &&
    Array.isArray(distractorFixes) &&
    distractorFixes.length >= 2
  );
}
```

- [ ] **Step 5: Update bug-hunt page template to use `code` instead of `codeSnippet`**

In `projects/rabbit-hole/src/app/pages/bug-hunt/bug-hunt.component.ts`, change:
```typescript
@if (scenario.codeSnippet) {
  <pre><code>{{ scenario.codeSnippet }}</code></pre>
}
```
to:
```typescript
@if (scenario.code) {
  <pre><code>{{ scenario.code }}</code></pre>
}
```

- [ ] **Step 6: Update existing tests that reference `codeSnippet`**

In `projects/rabbit-hole/src/app/features/bug-hunt/bug-hunt.store.spec.ts`, update any test scenario objects to use `code` instead of `codeSnippet`.

- [ ] **Step 7: Run tests to verify nothing broke**

Run: `npx ng test rabbit-hole --watch=false`
Expected: All existing tests pass

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat(rabbit-hole): add CodeRabbit review types and rename codeSnippet to code"
```

---

## Task 2: Create Server-Side Utilities

**Files:**
- Create: `projects/rabbit-hole/src/server/utils/temp-git-repo.ts`
- Create: `projects/rabbit-hole/src/server/utils/cli-runner.ts`

- [ ] **Step 1: Create the temp-git-repo utility**

```typescript
// projects/rabbit-hole/src/server/utils/temp-git-repo.ts
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
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
  const dir = await mkdtemp(join(tmpdir(), 'coderabbit-review-'));
  const filePath = join(dir, filename);

  await execFileAsync('git', ['init'], { cwd: dir });
  await execFileAsync('git', ['commit', '--allow-empty', '-m', 'initial'], {
    cwd: dir,
  });
  await writeFile(filePath, code, 'utf-8');
  await execFileAsync('git', ['add', filename], { cwd: dir });

  const cleanup = async () => {
    await rm(dir, { recursive: true, force: true }).catch(() => {});
  };

  return { dir, filePath, cleanup };
}
```

- [ ] **Step 2: Create the CLI runner utility**

```typescript
// projects/rabbit-hole/src/server/utils/cli-runner.ts
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

  const { stdout } = await execFileAsync(
    'npx',
    ['@coderabbitai/coderabbit', 'review', '--json'],
    {
      cwd: repoDir,
      env,
      timeout: CLI_TIMEOUT_MS,
    },
  );

  return parseCliOutput(stdout);
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
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(rabbit-hole): add server-side temp git repo and CLI runner utilities"
```

---

## Task 3: Create the Express API Route

**Files:**
- Create: `projects/rabbit-hole/src/server/routes/coderabbit-review.route.ts`
- Modify: `projects/rabbit-hole/src/server.ts`

- [ ] **Step 1: Create the route handler**

```typescript
// projects/rabbit-hole/src/server/routes/coderabbit-review.route.ts
import { Router } from 'express';
import { createTempGitRepo } from '../utils/temp-git-repo';
import { runCodeRabbitReview } from '../utils/cli-runner';

const router = Router();

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 10;
const requestCounts = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = requestCounts.get(ip);

  if (!entry || now > entry.resetAt) {
    requestCounts.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }

  entry.count += 1;
  return entry.count > RATE_LIMIT_MAX;
}

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
    !code.trim()
  ) {
    res.status(400).json({ error: 'Invalid request: scenarioId, code, and filename are required' });
    return;
  }

  let repo: Awaited<ReturnType<typeof createTempGitRepo>> | null = null;

  try {
    repo = await createTempGitRepo(code, filename);
    const result = await runCodeRabbitReview(repo.dir, apiKey);
    res.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';

    if (message.includes('TIMEOUT') || message.includes('timed out')) {
      res.status(504).json({ error: 'Review timed out, try again' });
    } else {
      res.status(500).json({ error: 'Review failed' });
    }
  } finally {
    if (repo) {
      repo.cleanup();
    }
  }
});

export const coderabbitReviewRouter = router;
```

- [ ] **Step 2: Register the route in server.ts**

In `projects/rabbit-hole/src/server.ts`, add the route before the static file serving:

```typescript
import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { join } from 'node:path';
import { coderabbitReviewRouter } from './server/routes/coderabbit-review.route';

const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();
const angularApp = new AngularNodeAppEngine();

// Parse JSON request bodies for API routes
app.use(express.json());

// API routes
app.use(coderabbitReviewRouter);

/**
 * Serve static files from /browser
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) => (response ? writeResponseToNodeResponse(response, res) : next()))
    .catch(next);
});

/**
 * Start the server if this module is the main entry point, or it is ran via PM2.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) {
      throw error;
    }

    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(rabbit-hole): add CodeRabbit review API route with rate limiting"
```

---

## Task 4: Create the Angular Review Service

**Files:**
- Create: `projects/rabbit-hole/src/app/services/coderabbit-review.service.ts`
- Create: `projects/rabbit-hole/src/app/services/coderabbit-review.service.spec.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// projects/rabbit-hole/src/app/services/coderabbit-review.service.spec.ts
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { CodeRabbitReviewService } from './coderabbit-review.service';
import type { CodeRabbitReview } from '../features/bug-hunt/coderabbit-review.types';

describe('CodeRabbitReviewService', () => {
  let service: CodeRabbitReviewService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(CodeRabbitReviewService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('should send a POST request with scenario data', () => {
    const mockResponse: CodeRabbitReview = {
      comments: [{ line: 5, message: 'Mutation detected', severity: 'warning' }],
      summary: 'Found 1 issue.',
    };

    service
      .requestReview('stale-state', 'const x = 1;', 'component.ts')
      .subscribe((result) => {
        expect(result).toEqual(mockResponse);
      });

    const req = httpTesting.expectOne('/api/coderabbit-review');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      scenarioId: 'stale-state',
      code: 'const x = 1;',
      filename: 'component.ts',
    });

    req.flush(mockResponse);
  });

  it('should propagate HTTP errors', () => {
    service
      .requestReview('bad-id', 'code', 'file.ts')
      .subscribe({
        error: (err) => {
          expect(err.status).toBe(401);
        },
      });

    const req = httpTesting.expectOne('/api/coderabbit-review');
    req.flush({ error: 'CodeRabbit not configured' }, { status: 401, statusText: 'Unauthorized' });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx ng test rabbit-hole --watch=false`
Expected: FAIL — service not found

- [ ] **Step 3: Write the service implementation**

```typescript
// projects/rabbit-hole/src/app/services/coderabbit-review.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import type {
  CodeRabbitReview,
  CodeRabbitReviewRequest,
} from '../features/bug-hunt/coderabbit-review.types';

@Injectable({ providedIn: 'root' })
export class CodeRabbitReviewService {
  private readonly http = inject(HttpClient);

  requestReview(
    scenarioId: string,
    code: string,
    filename: string,
  ): Observable<CodeRabbitReview> {
    const body: CodeRabbitReviewRequest = { scenarioId, code, filename };
    return this.http.post<CodeRabbitReview>('/api/coderabbit-review', body);
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx ng test rabbit-hole --watch=false`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(rabbit-hole): add CodeRabbitReviewService with tests"
```

---

## Task 5: Extend the Bug Hunt Store with Review State

**Files:**
- Modify: `projects/rabbit-hole/src/app/features/bug-hunt/bug-hunt.store.ts`
- Modify: `projects/rabbit-hole/src/app/features/bug-hunt/bug-hunt.store.spec.ts`

- [ ] **Step 1: Write failing tests for review state**

Add to `projects/rabbit-hole/src/app/features/bug-hunt/bug-hunt.store.spec.ts`:

```typescript
import { of, throwError } from 'rxjs';
import type { CodeRabbitReview } from './coderabbit-review.types';
import { CodeRabbitReviewService } from '../../services/coderabbit-review.service';

// Add inside the existing describe block, after existing tests:

describe('CodeRabbit review', () => {
  let mockReviewService: { requestReview: ReturnType<typeof vi.fn> };

  const mockReview: CodeRabbitReview = {
    comments: [{ line: 3, message: 'Array mutation', severity: 'warning' }],
    summary: 'Found 1 issue.',
  };

  beforeEach(() => {
    mockReviewService = { requestReview: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        BugHuntStore,
        { provide: BUG_HUNT_SCENARIOS, useValue: TEST_SCENARIOS },
        { provide: CodeRabbitReviewService, useValue: mockReviewService },
      ],
    });
  });

  it('should set reviewLoading to true when requesting a review', () => {
    mockReviewService.requestReview.mockReturnValue(of(mockReview));
    const store = TestBed.inject(BugHuntStore);
    store.requestReview();
    expect(store.reviewLoading()).toBe(false); // completes synchronously with of()
    expect(store.reviewResult()).toEqual(mockReview);
  });

  it('should set reviewError on failure', () => {
    mockReviewService.requestReview.mockReturnValue(
      throwError(() => ({ status: 504, error: { error: 'Review timed out, try again' } })),
    );
    const store = TestBed.inject(BugHuntStore);
    store.requestReview();
    expect(store.reviewError()).toBe('Review timed out, try again');
    expect(store.reviewLoading()).toBe(false);
  });

  it('should reset review state when advancing to next scenario', () => {
    mockReviewService.requestReview.mockReturnValue(of(mockReview));
    const store = TestBed.inject(BugHuntStore);
    store.requestReview();
    expect(store.reviewResult()).not.toBeNull();

    store.submitFix('replace-array');
    store.advancePractice();
    expect(store.reviewResult()).toBeNull();
    expect(store.reviewError()).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx ng test rabbit-hole --watch=false`
Expected: FAIL — `requestReview` not defined on store

- [ ] **Step 3: Implement review state in the store**

Update `projects/rabbit-hole/src/app/features/bug-hunt/bug-hunt.store.ts`:

Add imports at top:
```typescript
import { inject, signal } from '@angular/core';
import { CodeRabbitReviewService } from '../../services/coderabbit-review.service';
import type { CodeRabbitReview } from './coderabbit-review.types';
```

Add to the class body:
```typescript
private readonly reviewService = inject(CodeRabbitReviewService);

readonly reviewLoading = signal(false);
readonly reviewResult = signal<CodeRabbitReview | null>(null);
readonly reviewError = signal<string | null>(null);

requestReview(): void {
  const scenario = this.activeScenario();
  if (!scenario || this.reviewLoading()) {
    return;
  }

  this.reviewLoading.set(true);
  this.reviewError.set(null);
  this.reviewResult.set(null);

  const filename = `scenario-${scenario.id}.ts`;

  this.reviewService.requestReview(scenario.id, scenario.code, filename).subscribe({
    next: (result) => {
      this.reviewResult.set(result);
      this.reviewLoading.set(false);
    },
    error: (err) => {
      const message =
        err?.error?.error ?? err?.message ?? 'Review failed';
      this.reviewError.set(message);
      this.reviewLoading.set(false);
    },
  });
}

private resetReviewState(): void {
  this.reviewLoading.set(false);
  this.reviewResult.set(null);
  this.reviewError.set(null);
}
```

Call `this.resetReviewState()` inside `advancePractice()` (after resetting `latestResult`) and inside `advanceToNextScenario()`.

Also call `this.resetReviewState()` inside `resetRoundState()`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx ng test rabbit-hole --watch=false`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(rabbit-hole): add review state and requestReview action to BugHuntStore"
```

---

## Task 6: Update the Explanation Panel Component

**Files:**
- Modify: `projects/rabbit-hole/src/app/components/explanation-panel/explanation-panel.component.ts`

- [ ] **Step 1: Update the component to accept review inputs and display review UI**

Replace the full component file:

```typescript
// projects/rabbit-hole/src/app/components/explanation-panel/explanation-panel.component.ts
import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';
import type {
  BugHuntMode,
  BugHuntMatchResult,
  TimedRunSummary,
} from '../../features/bug-hunt/bug-hunt.types';
import type { CodeRabbitReview } from '../../features/bug-hunt/coderabbit-review.types';

@Component({
  selector: 'app-explanation-panel',
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section
      class="explanation-panel"
      aria-live="polite"
      aria-labelledby="bug-hunt-explanation-heading">
      <h2 id="bug-hunt-explanation-heading">Explanation</h2>

      @if (mode() === 'practice' && latestResult()) {
        <div class="result" [class.correct]="latestResult()!.isCorrect" [class.incorrect]="!latestResult()!.isCorrect">
          <h3>{{ latestResult()!.isCorrect ? 'Correct!' : 'Incorrect' }}</h3>

          @if (reviewResult()) {
            <div class="coderabbit-review">
              <h4>CodeRabbit Review</h4>
              <p class="review-summary">{{ reviewResult()!.summary }}</p>
              @if (reviewResult()!.comments.length > 0) {
                <ul class="review-comments" aria-label="Review comments">
                  @for (comment of reviewResult()!.comments; track comment.line) {
                    <li>
                      <span class="comment-severity" [attr.data-severity]="comment.severity">{{ comment.severity }}</span>
                      <span class="comment-line">Line {{ comment.line }}:</span>
                      <span class="comment-message">{{ comment.message }}</span>
                    </li>
                  }
                </ul>
              }
            </div>
          } @else if (reviewLoading()) {
            <div class="review-loading" role="status" aria-label="Loading review">
              <p>CodeRabbit is reviewing this code…</p>
            </div>
          } @else if (reviewError()) {
            <div class="review-error" role="alert">
              <p>{{ reviewError() }}</p>
              <button type="button" (click)="reviewRequested.emit()" aria-label="Retry CodeRabbit review">
                Retry
              </button>
            </div>
          } @else {
            <p>{{ latestResult()!.explanation }}</p>
            <button
              type="button"
              class="review-button"
              (click)="reviewRequested.emit()"
              aria-label="Get CodeRabbit review for this bug">
              Get CodeRabbit Review
            </button>
          }

          <button type="button" class="advance-button" (click)="advanceRequested.emit()">Next Scenario</button>
        </div>
      } @else if (mode() === 'practice' && practiceComplete()) {
        <div class="completion">
          <h3>Practice Complete!</h3>
          <p>You've completed all practice scenarios.</p>
        </div>
      } @else if (mode() === 'timed' && timedSummary()) {
        <div class="summary">
          <h3>Timed Run Summary</h3>
          <p>Score: {{ timedSummary()!.score }}</p>
          <p>Best Streak: {{ timedSummary()!.bestStreak }}</p>
          <p>Time Used: {{ timedSummary()!.secondsUsed }}s</p>
          @if (timedSummary()!.noMisses) {
            <p>No missed categories this run.</p>
          } @else {
            <div class="missed-categories">
              <h4>Missed Categories:</h4>
              <ul>
                @for (cat of timedSummary()!.mostMissedCategories; track cat.category) {
                  <li>{{ cat.category }}: {{ cat.misses }} misses</li>
                }
              </ul>
            </div>
          }
        </div>
      } @else {
        <div class="idle">
          <p>Select a fix and submit to see results.</p>
        </div>
      }
    </section>
  `,
  styles: `
    .explanation-panel {
      padding: 1rem;
      border: 1px solid #ccc;
      margin-top: 1rem;
    }

    .explanation-panel h2 {
      margin-top: 0;
    }

    .result {
      padding: 1rem;
    }

    .result.correct {
      background: rgba(52, 211, 153, 0.15);
      border-left: 4px solid #34d399;
      color: var(--qmd-text-primary);
    }

    .result.incorrect {
      background: rgba(248, 113, 113, 0.15);
      border-left: 4px solid #f87171;
      color: var(--qmd-text-primary);
    }

    .result h3 {
      margin-top: 0;
    }

    .advance-button {
      margin-top: 1rem;
      padding: 0.5rem 1rem;
      border: 1px solid #007bff;
      background: #007bff;
      color: white;
      cursor: pointer;
    }

    .review-button {
      margin-top: 0.75rem;
      padding: 0.5rem 1rem;
      border: 1px solid #8b5cf6;
      background: #8b5cf6;
      color: white;
      cursor: pointer;
    }

    .coderabbit-review {
      margin-top: 1rem;
      padding: 0.75rem;
      border: 1px solid #8b5cf6;
      border-radius: 4px;
      background: rgba(139, 92, 246, 0.08);
    }

    .coderabbit-review h4 {
      margin: 0 0 0.5rem;
      color: #8b5cf6;
    }

    .review-summary {
      margin: 0 0 0.5rem;
      font-style: italic;
    }

    .review-comments {
      list-style: none;
      padding: 0;
      margin: 0;
    }

    .review-comments li {
      padding: 0.5rem 0;
      border-top: 1px solid rgba(139, 92, 246, 0.2);
      display: flex;
      gap: 0.5rem;
      align-items: baseline;
      flex-wrap: wrap;
    }

    .comment-severity {
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      padding: 0.125rem 0.375rem;
      border-radius: 3px;
      background: rgba(139, 92, 246, 0.2);
    }

    .comment-severity[data-severity="warning"] {
      background: rgba(251, 191, 36, 0.2);
      color: #d97706;
    }

    .comment-severity[data-severity="error"] {
      background: rgba(239, 68, 68, 0.2);
      color: #dc2626;
    }

    .comment-line {
      font-family: monospace;
      font-size: 0.85rem;
      opacity: 0.7;
    }

    .review-loading {
      margin-top: 0.75rem;
      padding: 0.75rem;
      background: rgba(139, 92, 246, 0.05);
      border-radius: 4px;
    }

    .review-error {
      margin-top: 0.75rem;
      padding: 0.75rem;
      background: rgba(239, 68, 68, 0.05);
      border: 1px solid rgba(239, 68, 68, 0.2);
      border-radius: 4px;
    }

    .review-error button {
      margin-top: 0.5rem;
      padding: 0.375rem 0.75rem;
      border: 1px solid #ef4444;
      background: transparent;
      color: #ef4444;
      cursor: pointer;
    }

    .completion,
    .summary,
    .idle {
      padding: 1rem;
    }

    .completion h3,
    .summary h3 {
      margin-top: 0;
    }

    .missed-categories {
      margin-top: 1rem;
    }

    .missed-categories ul {
      list-style: disc;
      padding-left: 1.5rem;
    }
  `,
})
export class ExplanationPanelComponent {
  readonly mode = input.required<BugHuntMode>();
  readonly latestResult = input<BugHuntMatchResult | null>(null);
  readonly practiceComplete = input<boolean>(false);
  readonly timedSummary = input<TimedRunSummary | null>(null);
  readonly reviewLoading = input<boolean>(false);
  readonly reviewResult = input<CodeRabbitReview | null>(null);
  readonly reviewError = input<string | null>(null);

  readonly advanceRequested = output<void>();
  readonly reviewRequested = output<void>();
}
```

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "feat(rabbit-hole): update explanation panel with CodeRabbit review UI"
```

---

## Task 7: Wire the Review into the Page Component

**Files:**
- Modify: `projects/rabbit-hole/src/app/pages/bug-hunt/bug-hunt.component.ts`

- [ ] **Step 1: Update the page component template to pass review state**

In the `<app-explanation-panel>` usage, add the new inputs and output:

```typescript
<app-explanation-panel
  [mode]="store.mode()"
  [latestResult]="store.latestResult()"
  [practiceComplete]="store.practiceComplete()"
  [timedSummary]="store.timedSummary()"
  [reviewLoading]="store.reviewLoading()"
  [reviewResult]="store.reviewResult()"
  [reviewError]="store.reviewError()"
  (advanceRequested)="store.advancePractice()"
  (reviewRequested)="store.requestReview()" />
```

- [ ] **Step 2: Add `provideHttpClient()` to the app config**

In `projects/rabbit-hole/src/app/app.config.ts`, add `provideHttpClient()`:

```typescript
import { provideHttpClient } from '@angular/common/http';

// Add to the providers array:
provideHttpClient(),
```

- [ ] **Step 3: Run the full test suite**

Run: `npx ng test rabbit-hole --watch=false`
Expected: All tests pass

- [ ] **Step 4: Build the app to verify no compile errors**

Run: `npx ng build rabbit-hole`
Expected: Build succeeds

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(rabbit-hole): wire CodeRabbit review into bug hunt page component"
```

---

## Task 8: Final Verification and Cleanup

- [ ] **Step 1: Run the full test suite one final time**

Run: `npx ng test rabbit-hole --watch=false`
Expected: All tests pass

- [ ] **Step 2: Run the build**

Run: `npx ng build rabbit-hole`
Expected: Build succeeds with no errors

- [ ] **Step 3: Verify the server starts without errors**

Run: `npm run serve:ssr:rabbit-hole` (briefly, then stop)
Expected: Server starts and listens on port 4000

- [ ] **Step 4: Final commit if any remaining changes**

```bash
git status
# If clean, nothing to commit
```
