# Bug Hunt Lab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a local-only Bug Hunt Lab page to qmd-app with a shared Practice/Timed triage board, keyboard-first matching, typed scenario catalog, score/streak/timer state, and the planned test coverage.

**Architecture:** The feature stays entirely in the Angular app. A lazy-loaded `/bug-hunt` page provides a route-scoped `BugHuntStore` that owns catalog validation, gameplay state, scoring, streaks, timer lifecycle, and explanation/summary state. Small presentational components render the header, queue, fix pool, match zone, and explanation panel, while tests split between route/page integration and store rule coverage.

**Tech Stack:** Angular 21 standalone components, signals/computed state, Angular TestBed + RouterTestingHarness, TypeScript strict mode, existing `npm` build/test scripts.

---

## File Map

| Action | Path | Purpose |
|--------|------|---------|
| Modify | `src/app/app.routes.ts` | Register the lazy `/bug-hunt` page route |
| Modify | `src/app/components/sidebar/sidebar.component.ts` | Add the Bug Hunt Lab sidebar entry |
| Create | `src/app/app.routes.spec.ts` | Route + sidebar coverage for Bug Hunt Lab |
| Create | `src/app/pages/bug-hunt/bug-hunt.component.ts` | Route shell, route-scoped store provider, layout wiring |
| Create | `src/app/pages/bug-hunt/bug-hunt.component.spec.ts` | Page integration tests for layout, empty state, keyboard flow, timed summary |
| Create | `src/app/features/bug-hunt/bug-hunt.types.ts` | Shared gameplay types |
| Create | `src/app/features/bug-hunt/bug-hunt-scenarios.ts` | Default typed scenario catalog + injection token |
| Create | `src/app/features/bug-hunt/bug-hunt.store.ts` | Route-scoped signal store with validation, scoring, timer, summary, drag/selection state |
| Create | `src/app/features/bug-hunt/bug-hunt.store.spec.ts` | Store unit tests for practice/timed rules and invalid catalog behavior |
| Create | `src/app/components/bug-hunt-header/bug-hunt-header.component.ts` | Mode toggle, score, streak, timer, run controls |
| Create | `src/app/components/bug-queue/bug-queue.component.ts` | Remaining-scenarios queue UI |
| Create | `src/app/components/fix-pool/fix-pool.component.ts` | Selectable/draggable fix cards with keyboard support |
| Create | `src/app/components/match-zone/match-zone.component.ts` | Drop/result zone and submit action |
| Create | `src/app/components/explanation-panel/explanation-panel.component.ts` | Practice explanations and timed run summary |

---

## Task 1: Bootstrap the workspace and confirm the baseline

**Files:** none

- [ ] **Step 1: Install project dependencies**

Run:

```bash
npm ci
```

Expected: installs `node_modules`, including the local Angular CLI used by `npm run build` and `npm test`.

- [ ] **Step 2: Verify the existing build before changing code**

Run:

```bash
npm run build
```

Expected: exits `0` and prints Angular build completion output.

- [ ] **Step 3: Verify the existing unit tests before changing code**

Run:

```bash
npm test -- --watch=false
```

Expected: exits `0` and reports the current specs passing.

---

## Task 2: Add the route, sidebar entry, and a minimal page shell

**Files:**
- Create: `src/app/app.routes.spec.ts`
- Create: `src/app/pages/bug-hunt/bug-hunt.component.ts`
- Modify: `src/app/app.routes.ts`
- Modify: `src/app/components/sidebar/sidebar.component.ts`
- Test: `src/app/app.routes.spec.ts`

- [ ] **Step 1: Write the failing route/sidebar test**

Create `src/app/app.routes.spec.ts`:

```ts
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from './app.routes';
import { SidebarComponent } from './components/sidebar/sidebar.component';

describe('Bug Hunt route integration', () => {
  it('renders Bug Hunt Lab at /bug-hunt', async () => {
    TestBed.configureTestingModule({
      providers: [provideRouter(routes)],
    });

    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/bug-hunt');

    expect(
      harness.routeNativeElement?.querySelector('h1')?.textContent,
    ).toContain('Bug Hunt Lab');
  });

  it('shows the Bug Hunt Lab sidebar entry', async () => {
    await TestBed.configureTestingModule({
      imports: [SidebarComponent],
    }).compileComponents();

    const fixture = TestBed.createComponent(SidebarComponent);
    fixture.detectChanges();

    const links = Array.from(
      fixture.nativeElement.querySelectorAll('a'),
    ).map((link: HTMLAnchorElement) =>
      link.textContent?.replace(/\s+/g, ' ').trim(),
    );

    expect(links).toContain('🐞 Bug Hunt Lab');
  });
});
```

- [ ] **Step 2: Run the new test and verify it fails**

Run:

```bash
npm test -- --watch=false --include src/app/app.routes.spec.ts
```

Expected: FAIL because `/bug-hunt` is not registered yet and `BugHuntComponent` does not exist yet.

- [ ] **Step 3: Add the minimal route shell and navigation entry**

Create `src/app/pages/bug-hunt/bug-hunt.component.ts`:

```ts
import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-bug-hunt',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`
    .page { display: flex; flex-direction: column; gap: 12px; }
    h1 { margin: 0; font-size: 18px; font-weight: 600; color: var(--qmd-text-primary); }
    p { margin: 0; font-size: 13px; color: var(--qmd-text-muted); }
  `],
  template: `
    <section class="page" aria-labelledby="bug-hunt-heading">
      <h1 id="bug-hunt-heading">Bug Hunt Lab</h1>
      <p>Match each bug to the safest fix.</p>
    </section>
  `,
})
export class BugHuntComponent {}
```

Add this route object to `src/app/app.routes.ts` before the settings route:

```ts
{
  path: 'bug-hunt',
  loadComponent: () =>
    import('./pages/bug-hunt/bug-hunt.component').then(
      (m) => m.BugHuntComponent,
    ),
},
```

Add this entry to `navItems` in `src/app/components/sidebar/sidebar.component.ts`:

```ts
{ path: '/bug-hunt', label: 'Bug Hunt Lab', icon: '🐞', ariaLabel: 'Open Bug Hunt Lab' },
```

- [ ] **Step 4: Run the targeted route/sidebar test again**

Run:

```bash
npm test -- --watch=false --include src/app/app.routes.spec.ts
```

Expected: exits `0` with both route/sidebar specs passing.

- [ ] **Step 5: Commit the route-shell slice**

Run:

```bash
git add src/app/app.routes.ts src/app/components/sidebar/sidebar.component.ts src/app/app.routes.spec.ts src/app/pages/bug-hunt/bug-hunt.component.ts
git commit -m "feat: add Bug Hunt Lab route shell"
```

---

## Task 3: Add typed scenarios and the store skeleton with catalog validation

**Files:**
- Create: `src/app/features/bug-hunt/bug-hunt.types.ts`
- Create: `src/app/features/bug-hunt/bug-hunt-scenarios.ts`
- Create: `src/app/features/bug-hunt/bug-hunt.store.ts`
- Create: `src/app/features/bug-hunt/bug-hunt.store.spec.ts`
- Test: `src/app/features/bug-hunt/bug-hunt.store.spec.ts`

- [ ] **Step 1: Write the failing catalog/store boot tests**

Create `src/app/features/bug-hunt/bug-hunt.store.spec.ts`:

```ts
import { TestBed } from '@angular/core/testing';
import { BUG_HUNT_SCENARIOS } from './bug-hunt-scenarios';
import { BugHuntStore } from './bug-hunt.store';
import type { BugHuntScenario } from './bug-hunt.types';

const TEST_SCENARIOS: readonly BugHuntScenario[] = [
  {
    id: 'stale-state',
    title: 'Stale list after update',
    bugPattern: 'A signal-backed list updates in memory but the template never refreshes.',
    category: 'frontend',
    difficulty: 'intro',
    prompt: 'Which fix should ship?',
    correctFix: {
      id: 'replace-array',
      label: 'Return a new array reference from the state update',
    },
    distractorFixes: [
      { id: 'mutate-array', label: 'Mutate the existing array in place again' },
      { id: 'manual-detect', label: 'Call change detection from every click handler' },
    ],
    explanation: 'Signals and OnPush updates are safest when state writes produce a new reference.',
  },
  {
    id: 'missing-null-guard',
    title: 'Undefined API field crashes the handler',
    bugPattern: 'The request handler assumes nested data is always present and throws on bad input.',
    category: 'backend',
    difficulty: 'intermediate',
    prompt: 'Which fix should ship?',
    correctFix: {
      id: 'guard-input',
      label: 'Validate the payload and return a 400 before reading nested fields',
    },
    distractorFixes: [
      { id: 'non-null-assert', label: 'Add a non-null assertion and keep the same access path' },
      { id: 'silent-catch', label: 'Catch the error and continue with an empty object' },
    ],
    explanation: 'Validate the contract at the edge and fail explicitly instead of crashing deeper in the flow.',
  },
];

describe('BugHuntStore catalog boot', () => {
  it('loads the first scenario and its fix pool from a valid catalog', () => {
    TestBed.configureTestingModule({
      providers: [
        BugHuntStore,
        { provide: BUG_HUNT_SCENARIOS, useValue: TEST_SCENARIOS },
      ],
    });

    const store = TestBed.inject(BugHuntStore);

    expect(store.emptyStateMessage()).toBeNull();
    expect(store.activeScenario()?.id).toBe('stale-state');
    expect(store.queue().length).toBe(2);
    expect(store.currentFixes().map((fix) => fix.id)).toContain('replace-array');
  });

  it('returns an empty-state message when the catalog is malformed', () => {
    TestBed.configureTestingModule({
      providers: [
        BugHuntStore,
        { provide: BUG_HUNT_SCENARIOS, useValue: [{ id: 'broken' }] },
      ],
    });

    const store = TestBed.inject(BugHuntStore);

    expect(store.activeScenario()).toBeNull();
    expect(store.currentFixes()).toEqual([]);
    expect(store.emptyStateMessage()).toContain('no playable scenarios');
  });
});
```

- [ ] **Step 2: Run the store spec and verify it fails**

Run:

```bash
npm test -- --watch=false --include src/app/features/bug-hunt/bug-hunt.store.spec.ts
```

Expected: FAIL because the Bug Hunt feature types, token, scenarios, and store do not exist yet.

- [ ] **Step 3: Create the feature types, default catalog, and validating store skeleton**

Create `src/app/features/bug-hunt/bug-hunt.types.ts`:

```ts
export type BugHuntMode = 'practice' | 'timed';
export type BugHuntCategory =
  | 'frontend'
  | 'backend'
  | 'data'
  | 'testing'
  | 'performance'
  | 'accessibility';
export type BugHuntDifficulty = 'intro' | 'intermediate' | 'advanced';

export interface BugFixOption {
  id: string;
  label: string;
}

export interface BugHuntScenario {
  id: string;
  title: string;
  bugPattern: string;
  category: BugHuntCategory;
  difficulty: BugHuntDifficulty;
  prompt: string;
  correctFix: BugFixOption;
  distractorFixes: readonly BugFixOption[];
  explanation: string;
}

export interface BugHuntMatchResult {
  isCorrect: boolean;
  selectedFixId: string;
  correctFixId: string;
  explanation: string;
  category: BugHuntCategory;
}

export interface MissedCategoryStat {
  category: BugHuntCategory;
  misses: number;
}

export interface TimedRunSummary {
  score: number;
  bestStreak: number;
  totalMistakes: number;
  mostMissedCategories: readonly MissedCategoryStat[];
  noMisses: boolean;
}
```

Create `src/app/features/bug-hunt/bug-hunt-scenarios.ts`:

```ts
import { InjectionToken } from '@angular/core';
import type { BugHuntScenario } from './bug-hunt.types';

export const DEFAULT_BUG_HUNT_SCENARIOS: readonly BugHuntScenario[] = [
  {
    id: 'stale-state',
    title: 'Stale list after update',
    bugPattern: 'A signal-backed list updates in memory but the template never refreshes.',
    category: 'frontend',
    difficulty: 'intro',
    prompt: 'Which fix should ship?',
    correctFix: {
      id: 'replace-array',
      label: 'Return a new array reference from the state update',
    },
    distractorFixes: [
      { id: 'mutate-array', label: 'Mutate the existing array in place again' },
      { id: 'manual-detect', label: 'Call change detection from every click handler' },
    ],
    explanation: 'Signals and OnPush updates are safest when state writes produce a new reference.',
  },
  {
    id: 'missing-null-guard',
    title: 'Undefined API field crashes the handler',
    bugPattern: 'The request handler assumes nested data is always present and throws on bad input.',
    category: 'backend',
    difficulty: 'intermediate',
    prompt: 'Which fix should ship?',
    correctFix: {
      id: 'guard-input',
      label: 'Validate the payload and return a 400 before reading nested fields',
    },
    distractorFixes: [
      { id: 'non-null-assert', label: 'Add a non-null assertion and keep the same access path' },
      { id: 'silent-catch', label: 'Catch the error and continue with an empty object' },
    ],
    explanation: 'Validate the contract at the edge and fail explicitly instead of crashing deeper in the flow.',
  },
  {
    id: 'missing-button-name',
    title: 'Icon-only control has no accessible name',
    bugPattern: 'A visual button exists, but assistive technology announces it as an unlabeled control.',
    category: 'accessibility',
    difficulty: 'intro',
    prompt: 'Which fix should ship?',
    correctFix: {
      id: 'add-accessible-name',
      label: 'Give the control a visible label or aria-label that matches its purpose',
    },
    distractorFixes: [
      { id: 'wrap-div', label: 'Wrap the icon in another div and keep the same markup' },
      { id: 'hide-button', label: 'Hide the button from assistive technology' },
    ],
    explanation: 'Interactive controls need an accessible name so screen-reader users know what they do.',
  },
];

export const BUG_HUNT_SCENARIOS = new InjectionToken<readonly unknown[]>(
  'BUG_HUNT_SCENARIOS',
  {
    factory: () => DEFAULT_BUG_HUNT_SCENARIOS,
  },
);
```

Create `src/app/features/bug-hunt/bug-hunt.store.ts`:

```ts
import { Injectable, computed, inject, signal } from '@angular/core';
import { BUG_HUNT_SCENARIOS } from './bug-hunt-scenarios';
import type {
  BugFixOption,
  BugHuntMatchResult,
  BugHuntMode,
  BugHuntScenario,
  TimedRunSummary,
} from './bug-hunt.types';

interface CatalogValidation {
  scenarios: readonly BugHuntScenario[];
  error: string | null;
}

@Injectable()
export class BugHuntStore {
  private readonly rawCatalog = inject(BUG_HUNT_SCENARIOS);
  private readonly catalog = this.validateCatalog(this.rawCatalog);

  readonly mode = signal<BugHuntMode>('practice');
  readonly activeIndex = signal(0);
  readonly currentFixes = signal<BugFixOption[]>([]);
  readonly selectedFixId = signal<string | null>(null);
  readonly draggedFixId = signal<string | null>(null);
  readonly score = signal(0);
  readonly streak = signal(0);
  readonly bestStreak = signal(0);
  readonly remainingSeconds = signal(90);
  readonly totalMistakes = signal(0);
  readonly practiceComplete = signal(false);
  readonly latestResult = signal<BugHuntMatchResult | null>(null);
  readonly timedSummary = signal<TimedRunSummary | null>(null);
  readonly missedCategories = signal<Record<string, number>>({});
  readonly timedRunning = signal(false);
  readonly timedComplete = signal(false);

  readonly emptyStateMessage = computed(() => this.catalog.error);
  readonly scenarios = computed(() => this.catalog.scenarios);
  readonly activeScenario = computed(
    () => this.scenarios()[this.activeIndex()] ?? null,
  );
  readonly queue = computed(() => this.scenarios().slice(this.activeIndex()));

  constructor() {
    this.refreshFixes();
  }

  selectFix(fixId: string): void {
    this.selectedFixId.set(fixId);
  }

  beginDrag(fixId: string): void {
    this.draggedFixId.set(fixId);
  }

  clearDrag(): void {
    this.draggedFixId.set(null);
  }

  setMode(mode: BugHuntMode): void {
    this.mode.set(mode);
    this.resetRoundState();
  }

  submitFix(_fixId?: string): void {}

  advancePractice(): void {}

  startTimedRound(): void {}

  private resetRoundState(): void {
    this.activeIndex.set(0);
    this.currentFixes.set(this.buildFixPool(this.scenarios()[0] ?? null));
    this.selectedFixId.set(null);
    this.draggedFixId.set(null);
    this.score.set(0);
    this.streak.set(0);
    this.bestStreak.set(0);
    this.remainingSeconds.set(90);
    this.totalMistakes.set(0);
    this.practiceComplete.set(false);
    this.latestResult.set(null);
    this.timedSummary.set(null);
    this.missedCategories.set({});
  }

  private validateCatalog(rawCatalog: readonly unknown[]): CatalogValidation {
    if (!Array.isArray(rawCatalog) || rawCatalog.length === 0) {
      return {
        scenarios: [],
        error: 'Bug Hunt Lab has no playable scenarios available.',
      };
    }

    const scenarios = rawCatalog.filter(this.isScenario) as BugHuntScenario[];
    if (scenarios.length !== rawCatalog.length) {
      return {
        scenarios: [],
        error: 'Bug Hunt Lab has no playable scenarios available.',
      };
    }

    return {
      scenarios,
      error: null,
    };
  }

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
      typeof scenario['explanation'] === 'string' &&
      typeof correctFix?.['id'] === 'string' &&
      typeof correctFix?.['label'] === 'string' &&
      Array.isArray(distractorFixes) &&
      distractorFixes.length >= 2
    );
  }

  private refreshFixes(): void {
    this.currentFixes.set(this.buildFixPool(this.activeScenario()));
  }

  private buildFixPool(scenario: BugHuntScenario | null): BugFixOption[] {
    if (!scenario) {
      return [];
    }

    return this.shuffleFixes([
      scenario.correctFix,
      ...scenario.distractorFixes,
    ]);
  }

  private shuffleFixes(fixes: readonly BugFixOption[]): BugFixOption[] {
    const copy = [...fixes];
    for (let index = copy.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
    }
    return copy;
  }
}
```

- [ ] **Step 4: Run the store boot spec again**

Run:

```bash
npm test -- --watch=false --include src/app/features/bug-hunt/bug-hunt.store.spec.ts
```

Expected: exits `0`; the store validates the catalog, exposes the first scenario, and returns the empty-state message for malformed entries.

- [ ] **Step 5: Commit the feature skeleton**

Run:

```bash
git add src/app/features/bug-hunt/bug-hunt.types.ts src/app/features/bug-hunt/bug-hunt-scenarios.ts src/app/features/bug-hunt/bug-hunt.store.ts src/app/features/bug-hunt/bug-hunt.store.spec.ts
git commit -m "feat: add Bug Hunt Lab store skeleton"
```

---

## Task 4: Implement Practice mode scoring, streaks, and explanation flow

**Files:**
- Modify: `src/app/features/bug-hunt/bug-hunt.store.spec.ts`
- Modify: `src/app/features/bug-hunt/bug-hunt.store.ts`
- Test: `src/app/features/bug-hunt/bug-hunt.store.spec.ts`

- [ ] **Step 1: Add failing Practice mode rule tests**

Append these specs to `src/app/features/bug-hunt/bug-hunt.store.spec.ts`:

```ts
describe('BugHuntStore practice mode', () => {
  it('scores a correct answer, keeps the current card visible, and waits for explicit advance', () => {
    TestBed.configureTestingModule({
      providers: [
        BugHuntStore,
        { provide: BUG_HUNT_SCENARIOS, useValue: TEST_SCENARIOS },
      ],
    });

    const store = TestBed.inject(BugHuntStore);

    store.selectFix('replace-array');
    store.submitFix();

    expect(store.score()).toBe(1);
    expect(store.streak()).toBe(1);
    expect(store.bestStreak()).toBe(1);
    expect(store.latestResult()?.isCorrect).toBeTrue();
    expect(store.activeScenario()?.id).toBe('stale-state');

    store.advancePractice();

    expect(store.activeScenario()?.id).toBe('missing-null-guard');
    expect(store.latestResult()).toBeNull();
  });

  it('records an incorrect answer and counts the missed category', () => {
    TestBed.configureTestingModule({
      providers: [
        BugHuntStore,
        { provide: BUG_HUNT_SCENARIOS, useValue: TEST_SCENARIOS },
      ],
    });

    const store = TestBed.inject(BugHuntStore);

    store.selectFix('mutate-array');
    store.submitFix();

    expect(store.score()).toBe(0);
    expect(store.streak()).toBe(0);
    expect(store.totalMistakes()).toBe(1);
    expect(store.missedCategories()['frontend']).toBe(1);
    expect(store.latestResult()).toEqual(
      jasmine.objectContaining({
        isCorrect: false,
        selectedFixId: 'mutate-array',
        correctFixId: 'replace-array',
      }),
    );
  });

  it('resets round state when the player switches modes', () => {
    TestBed.configureTestingModule({
      providers: [
        BugHuntStore,
        { provide: BUG_HUNT_SCENARIOS, useValue: TEST_SCENARIOS },
      ],
    });

    const store = TestBed.inject(BugHuntStore);

    store.selectFix('replace-array');
    store.submitFix();
    store.setMode('timed');

    expect(store.mode()).toBe('timed');
    expect(store.score()).toBe(0);
    expect(store.streak()).toBe(0);
    expect(store.totalMistakes()).toBe(0);
    expect(store.latestResult()).toBeNull();
    expect(store.activeScenario()?.id).toBe('stale-state');
  });
});
```

- [ ] **Step 2: Run the Practice mode store tests and verify they fail**

Run:

```bash
npm test -- --watch=false --include src/app/features/bug-hunt/bug-hunt.store.spec.ts
```

Expected: FAIL because `submitFix()` and `advancePractice()` do not implement scoring/progression yet.

- [ ] **Step 3: Implement Practice mode round logic in the store**

Replace the placeholder methods in `src/app/features/bug-hunt/bug-hunt.store.ts` with:

```ts
submitFix(fixId = this.draggedFixId() ?? this.selectedFixId() ?? ''): void {
  const scenario = this.activeScenario();
  if (!scenario || !fixId || this.latestResult() !== null || this.practiceComplete()) {
    return;
  }

  const isCorrect = fixId === scenario.correctFix.id;
  const nextScore = this.score() + (isCorrect ? 1 : 0);
  const nextStreak = isCorrect ? this.streak() + 1 : 0;

  this.score.set(nextScore);
  this.streak.set(nextStreak);
  this.bestStreak.set(Math.max(this.bestStreak(), nextStreak));

  if (!isCorrect) {
    this.totalMistakes.set(this.totalMistakes() + 1);
    this.missedCategories.update((current) => ({
      ...current,
      [scenario.category]: (current[scenario.category] ?? 0) + 1,
    }));
  }

  this.latestResult.set({
    isCorrect,
    selectedFixId: fixId,
    correctFixId: scenario.correctFix.id,
    explanation: scenario.explanation,
    category: scenario.category,
  });

  this.selectedFixId.set(fixId);
  this.draggedFixId.set(null);

  if (this.mode() === 'timed') {
    this.advanceToNextScenario();
  }
}

advancePractice(): void {
  if (this.mode() !== 'practice' || this.latestResult() === null) {
    return;
  }

  if (this.activeIndex() === this.scenarios().length - 1) {
    this.latestResult.set(null);
    this.selectedFixId.set(null);
    this.draggedFixId.set(null);
    this.practiceComplete.set(true);
    return;
  }

  this.latestResult.set(null);
  this.selectedFixId.set(null);
  this.draggedFixId.set(null);
  this.advanceToNextScenario();
}

private advanceToNextScenario(): void {
  const scenarios = this.scenarios();
  if (scenarios.length === 0) {
    return;
  }

  const nextIndex = this.activeIndex() + 1;
  this.activeIndex.set(nextIndex < scenarios.length ? nextIndex : 0);
}
```

- [ ] **Step 4: Run the Practice mode store tests again**

Run:

```bash
npm test -- --watch=false --include src/app/features/bug-hunt/bug-hunt.store.spec.ts
```

Expected: exits `0`; correct/incorrect Practice behavior and mode resets are now covered.

- [ ] **Step 5: Commit the Practice mode rules**

Run:

```bash
git add src/app/features/bug-hunt/bug-hunt.store.ts src/app/features/bug-hunt/bug-hunt.store.spec.ts
git commit -m "feat: add Bug Hunt Lab practice mode rules"
```

---

## Task 5: Implement Timed mode countdown, wraparound, and summary data

**Files:**
- Modify: `src/app/features/bug-hunt/bug-hunt.store.spec.ts`
- Modify: `src/app/features/bug-hunt/bug-hunt.store.ts`
- Test: `src/app/features/bug-hunt/bug-hunt.store.spec.ts`

- [ ] **Step 1: Add failing Timed mode tests**

Append these specs to `src/app/features/bug-hunt/bug-hunt.store.spec.ts`:

```ts
import { fakeAsync, tick } from '@angular/core/testing';

describe('BugHuntStore timed mode', () => {
  it('starts a 90 second round and counts down once per second', fakeAsync(() => {
    TestBed.configureTestingModule({
      providers: [
        BugHuntStore,
        { provide: BUG_HUNT_SCENARIOS, useValue: TEST_SCENARIOS },
      ],
    });

    const store = TestBed.inject(BugHuntStore);

    store.setMode('timed');
    store.startTimedRound();

    expect(store.remainingSeconds()).toBe(90);

    tick(1000);

    expect(store.remainingSeconds()).toBe(89);
  }));

  it('wraps the deck in timed mode when the timer is still running', () => {
    TestBed.configureTestingModule({
      providers: [
        BugHuntStore,
        { provide: BUG_HUNT_SCENARIOS, useValue: TEST_SCENARIOS.slice(0, 2) },
      ],
    });

    const store = TestBed.inject(BugHuntStore);

    store.setMode('timed');
    store.startTimedRound();
    store.submitFix('replace-array');
    store.submitFix('guard-input');

    expect(store.activeScenario()?.id).toBe('stale-state');
  });

  it('finalizes a timed summary with sorted missed categories', fakeAsync(() => {
    TestBed.configureTestingModule({
      providers: [
        BugHuntStore,
        { provide: BUG_HUNT_SCENARIOS, useValue: TEST_SCENARIOS },
      ],
    });

    const store = TestBed.inject(BugHuntStore);

    store.setMode('timed');
    store.startTimedRound();
    store.submitFix('mutate-array');

    tick(90000);

    expect(store.timedSummary()).toEqual({
      score: 0,
      bestStreak: 0,
      totalMistakes: 1,
      mostMissedCategories: [{ category: 'frontend', misses: 1 }],
      noMisses: false,
    });
  }));
});
```

- [ ] **Step 2: Run the Timed mode tests and verify they fail**

Run:

```bash
npm test -- --watch=false --include src/app/features/bug-hunt/bug-hunt.store.spec.ts
```

Expected: FAIL because the store does not start a timer or build a timed summary yet.

- [ ] **Step 3: Implement the timed round lifecycle**

Update `src/app/features/bug-hunt/bug-hunt.store.ts` with these members and method bodies:

```ts
private timerId: ReturnType<typeof setInterval> | null = null;

startTimedRound(): void {
  if (this.mode() !== 'timed' || this.scenarios().length === 0) {
    return;
  }

  this.resetRoundState();
  this.mode.set('timed');
  this.timedRunning.set(true);
  this.timedComplete.set(false);
  this.remainingSeconds.set(90);

  this.timerId = setInterval(() => {
    const nextValue = this.remainingSeconds() - 1;
    this.remainingSeconds.set(nextValue);

    if (nextValue <= 0) {
      this.finishTimedRound();
    }
  }, 1000);
}

setMode(mode: BugHuntMode): void {
  this.stopTimer();
  this.mode.set(mode);
  this.timedRunning.set(false);
  this.timedComplete.set(false);
  this.resetRoundState();
}

private finishTimedRound(): void {
  this.stopTimer();
  this.timedRunning.set(false);
  this.timedComplete.set(true);
  this.remainingSeconds.set(0);

  const mostMissedCategories = Object.entries(this.missedCategories())
    .map(([category, misses]) => ({
      category: category as BugHuntCategory,
      misses,
    }))
    .sort((left, right) => right.misses - left.misses);

  this.timedSummary.set({
    score: this.score(),
    bestStreak: this.bestStreak(),
    totalMistakes: this.totalMistakes(),
    mostMissedCategories,
    noMisses: mostMissedCategories.length === 0,
  });
}

private stopTimer(): void {
  if (this.timerId !== null) {
    clearInterval(this.timerId);
    this.timerId = null;
  }
}

private resetRoundState(): void {
  this.stopTimer();
  this.activeIndex.set(0);
  this.currentFixes.set(this.buildFixPool(this.scenarios()[0] ?? null));
  this.selectedFixId.set(null);
  this.draggedFixId.set(null);
  this.score.set(0);
  this.streak.set(0);
  this.bestStreak.set(0);
  this.remainingSeconds.set(90);
  this.totalMistakes.set(0);
  this.practiceComplete.set(false);
  this.latestResult.set(null);
  this.timedSummary.set(null);
  this.missedCategories.set({});
}
```

Also extend the existing type import at the top of `src/app/features/bug-hunt/bug-hunt.store.ts` to include `BugHuntCategory`, because `finishTimedRound()` now casts the summary entries back to the category union:

```ts
import type {
  BugHuntCategory,
  BugHuntMatchResult,
  BugHuntMode,
  BugHuntScenario,
  TimedRunSummary,
} from './bug-hunt.types';
```

Also update `submitFix()` so the first guard reads:

```ts
if (
  !scenario ||
  !fixId ||
  this.practiceComplete() ||
  (this.mode() === 'practice' && this.latestResult() !== null) ||
  this.timedComplete()
) {
  return;
}
```

And update `advanceToNextScenario()` so timed mode wraps, while practice mode stops on the last card:

```ts
private advanceToNextScenario(): void {
  const scenarios = this.scenarios();
  if (scenarios.length === 0) {
    return;
  }

  const nextIndex = this.activeIndex() + 1;
  if (nextIndex < scenarios.length) {
    this.activeIndex.set(nextIndex);
    this.refreshFixes();
    return;
  }

  if (this.mode() === 'timed') {
    this.activeIndex.set(0);
    this.refreshFixes();
    return;
  }

  this.activeIndex.set(scenarios.length - 1);
  this.refreshFixes();
}
```

- [ ] **Step 4: Run the Timed mode store tests again**

Run:

```bash
npm test -- --watch=false --include src/app/features/bug-hunt/bug-hunt.store.spec.ts
```

Expected: exits `0`; the timer, deck wraparound, and timed summary data are now covered.

- [ ] **Step 5: Commit the Timed mode rules**

Run:

```bash
git add src/app/features/bug-hunt/bug-hunt.store.ts src/app/features/bug-hunt/bug-hunt.store.spec.ts
git commit -m "feat: add Bug Hunt Lab timed mode rules"
```

---

## Task 6: Build the board components and wire the page layout

**Files:**
- Create: `src/app/components/bug-hunt-header/bug-hunt-header.component.ts`
- Create: `src/app/components/bug-queue/bug-queue.component.ts`
- Create: `src/app/components/fix-pool/fix-pool.component.ts`
- Create: `src/app/components/match-zone/match-zone.component.ts`
- Create: `src/app/components/explanation-panel/explanation-panel.component.ts`
- Modify: `src/app/pages/bug-hunt/bug-hunt.component.ts`
- Create: `src/app/pages/bug-hunt/bug-hunt.component.spec.ts`
- Test: `src/app/pages/bug-hunt/bug-hunt.component.spec.ts`

- [ ] **Step 1: Write the failing page-shell tests**

Create `src/app/pages/bug-hunt/bug-hunt.component.spec.ts`:

```ts
import { TestBed } from '@angular/core/testing';
import { BUG_HUNT_SCENARIOS } from '../../features/bug-hunt/bug-hunt-scenarios';
import { BugHuntComponent } from './bug-hunt.component';
import type { BugHuntScenario } from '../../features/bug-hunt/bug-hunt.types';

const TEST_SCENARIOS: readonly BugHuntScenario[] = [
  {
    id: 'stale-state',
    title: 'Stale list after update',
    bugPattern: 'A signal-backed list updates in memory but the template never refreshes.',
    category: 'frontend',
    difficulty: 'intro',
    prompt: 'Which fix should ship?',
    correctFix: {
      id: 'replace-array',
      label: 'Return a new array reference from the state update',
    },
    distractorFixes: [
      { id: 'mutate-array', label: 'Mutate the existing array in place again' },
      { id: 'manual-detect', label: 'Call change detection from every click handler' },
    ],
    explanation: 'Signals and OnPush updates are safest when state writes produce a new reference.',
  },
];

describe('BugHuntComponent shell', () => {
  it('renders the shared Bug Hunt board layout', async () => {
    await TestBed.configureTestingModule({
      imports: [BugHuntComponent],
      providers: [{ provide: BUG_HUNT_SCENARIOS, useValue: TEST_SCENARIOS }],
    }).compileComponents();

    const fixture = TestBed.createComponent(BugHuntComponent);
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent.replace(/\s+/g, ' ').trim();

    expect(text).toContain('Bug Hunt Lab');
    expect(text).toContain('Practice');
    expect(text).toContain('Timed');
    expect(text).toContain('Bug Queue');
    expect(text).toContain('Fix Pool');
    expect(text).toContain('Drop Zone');
  });

  it('shows an empty state when no playable scenarios are available', async () => {
    await TestBed.configureTestingModule({
      imports: [BugHuntComponent],
      providers: [{ provide: BUG_HUNT_SCENARIOS, useValue: [] }],
    }).compileComponents();

    const fixture = TestBed.createComponent(BugHuntComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(
      'Bug Hunt Lab has no playable scenarios available.',
    );
  });
});
```

- [ ] **Step 2: Run the page-shell test and verify it fails**

Run:

```bash
npm test -- --watch=false --include src/app/pages/bug-hunt/bug-hunt.component.spec.ts
```

Expected: FAIL because the page component does not yet provide the board layout or empty-state rendering.

- [ ] **Step 3: Create the presentational components and wire the page**

Create `src/app/components/bug-hunt-header/bug-hunt-header.component.ts`:

```ts
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import type { BugHuntMode } from '../../features/bug-hunt/bug-hunt.types';

@Component({
  selector: 'app-bug-hunt-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`
    .header { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 12px; padding: 16px; border: 1px solid var(--qmd-border); border-radius: 12px; background: var(--qmd-surface); }
    .modes, .stats, .actions { display: flex; gap: 8px; align-items: center; }
    .mode-btn, .action-btn { border: 1px solid var(--qmd-border); background: transparent; color: var(--qmd-text-secondary); border-radius: 999px; padding: 6px 12px; cursor: pointer; }
    .mode-btn.active { background: rgba(167,139,250,0.15); color: var(--qmd-purple); border-color: var(--qmd-border-active); }
    .stat { font-size: 12px; color: var(--qmd-text-secondary); }
  `],
  template: `
    <section class="header" aria-label="Bug Hunt controls">
      <div class="modes" role="group" aria-label="Bug Hunt mode">
        <button type="button" class="mode-btn" [class.active]="mode() === 'practice'" [attr.aria-pressed]="mode() === 'practice'" (click)="modeChange.emit('practice')">Practice</button>
        <button type="button" class="mode-btn" [class.active]="mode() === 'timed'" [attr.aria-pressed]="mode() === 'timed'" (click)="modeChange.emit('timed')" data-testid="mode-timed">Timed</button>
      </div>

      <div class="stats" aria-live="polite">
        <span class="stat">Score {{ score() }}</span>
        <span class="stat">Streak {{ streak() }}</span>
        <span class="stat">Best {{ bestStreak() }}</span>
        @if (mode() === 'timed') {
          <span class="stat">Time {{ remainingSeconds() }}s</span>
        }
      </div>

      <div class="actions">
        @if (mode() === 'timed' && !timedRunning() && !timedComplete()) {
          <button type="button" class="action-btn" (click)="startTimed.emit()" data-testid="start-timed">Start Timed Run</button>
        }
        <button type="button" class="action-btn" (click)="resetRound.emit()">Reset</button>
      </div>
    </section>
  `,
})
export class BugHuntHeaderComponent {
  readonly mode = input.required<BugHuntMode>();
  readonly score = input.required<number>();
  readonly streak = input.required<number>();
  readonly bestStreak = input.required<number>();
  readonly remainingSeconds = input.required<number>();
  readonly timedRunning = input.required<boolean>();
  readonly timedComplete = input.required<boolean>();

  readonly modeChange = output<BugHuntMode>();
  readonly startTimed = output<void>();
  readonly resetRound = output<void>();
}
```

Create `src/app/components/bug-queue/bug-queue.component.ts`:

```ts
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { BugHuntScenario } from '../../features/bug-hunt/bug-hunt.types';

@Component({
  selector: 'app-bug-queue',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`
    .queue { border: 1px solid var(--qmd-border); border-radius: 12px; background: var(--qmd-surface); padding: 16px; }
    ul { list-style: none; padding: 0; margin: 12px 0 0; display: flex; flex-direction: column; gap: 8px; }
    li { padding: 8px 10px; border-radius: 8px; background: rgba(255,255,255,0.03); color: var(--qmd-text-secondary); font-size: 12px; }
    li.active { border: 1px solid var(--qmd-border-active); color: var(--qmd-text-primary); }
  `],
  template: `
    <section class="queue" aria-labelledby="bug-queue-heading">
      <h2 id="bug-queue-heading">Bug Queue</h2>
      <ul>
        @for (scenario of scenarios(); track scenario.id) {
          <li [class.active]="scenario.id === activeScenarioId()" [attr.aria-current]="scenario.id === activeScenarioId() ? 'step' : null">
            {{ scenario.title }}
          </li>
        }
      </ul>
    </section>
  `,
})
export class BugQueueComponent {
  readonly scenarios = input.required<readonly BugHuntScenario[]>();
  readonly activeScenarioId = input.required<string | null>();
}
```

Create `src/app/components/fix-pool/fix-pool.component.ts`:

```ts
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import type { BugFixOption } from '../../features/bug-hunt/bug-hunt.types';

@Component({
  selector: 'app-fix-pool',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`
    .pool { border: 1px solid var(--qmd-border); border-radius: 12px; background: var(--qmd-surface); padding: 16px; }
    .options { display: grid; gap: 8px; margin-top: 12px; }
    .option { width: 100%; text-align: left; border: 1px solid var(--qmd-border); background: transparent; color: var(--qmd-text-primary); border-radius: 10px; padding: 12px; cursor: pointer; }
    .option.selected { border-color: var(--qmd-border-active); box-shadow: 0 0 0 2px rgba(167,139,250,0.18); }
  `],
  template: `
    <section class="pool" aria-labelledby="fix-pool-heading">
      <h2 id="fix-pool-heading">Fix Pool</h2>
      <div class="options">
        @for (fix of fixes(); track fix.id) {
          <button
            type="button"
            class="option"
            [class.selected]="fix.id === selectedFixId()"
            [attr.aria-pressed]="fix.id === selectedFixId()"
            [draggable]="!disabled()"
            [disabled]="disabled()"
            data-testid="fix-option"
            (click)="fixSelected.emit(fix.id)"
            (keydown.enter)="selectFromKeyboard($event, fix.id)"
            (keydown.space)="selectFromKeyboard($event, fix.id)"
            (dragstart)="dragStarted.emit(fix.id)"
          >
            {{ fix.label }}
          </button>
        }
      </div>
    </section>
  `,
})
export class FixPoolComponent {
  readonly fixes = input.required<readonly BugFixOption[]>();
  readonly selectedFixId = input.required<string | null>();
  readonly disabled = input.required<boolean>();

  readonly fixSelected = output<string>();
  readonly dragStarted = output<string>();

  selectFromKeyboard(event: KeyboardEvent, fixId: string): void {
    event.preventDefault();
    this.fixSelected.emit(fixId);
  }
}
```

Create `src/app/components/match-zone/match-zone.component.ts`:

```ts
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'app-match-zone',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`
    .zone { border: 1px dashed var(--qmd-border-active); border-radius: 12px; background: rgba(167,139,250,0.08); padding: 16px; display: flex; flex-direction: column; gap: 12px; }
    .submit { align-self: flex-start; border: 1px solid var(--qmd-border-active); background: var(--qmd-gradient); color: #fff; border-radius: 999px; padding: 8px 14px; cursor: pointer; }
  `],
  template: `
    <section class="zone" aria-labelledby="drop-zone-heading" (dragover)="allowDrop($event)" (drop)="handleDrop($event)">
      <h2 id="drop-zone-heading">Drop Zone</h2>
      <p>{{ selectedLabel() ?? 'Select or drag a fix, then confirm the match.' }}</p>
      <button
        type="button"
        class="submit"
        [disabled]="disabled() || !selectedLabel()"
        data-testid="submit-match"
        (click)="submitClicked.emit()"
        (keydown.enter)="submitFromKeyboard($event)"
        (keydown.space)="submitFromKeyboard($event)"
      >
        Confirm Match
      </button>
    </section>
  `,
})
export class MatchZoneComponent {
  readonly selectedLabel = input.required<string | null>();
  readonly disabled = input.required<boolean>();
  readonly draggedFixId = input.required<string | null>();

  readonly fixDropped = output<string>();
  readonly submitClicked = output<void>();

  allowDrop(event: DragEvent): void {
    event.preventDefault();
  }

  handleDrop(event: DragEvent): void {
    event.preventDefault();
    const fixId = this.draggedFixId();
    if (fixId) {
      this.fixDropped.emit(fixId);
    }
  }

  submitFromKeyboard(event: KeyboardEvent): void {
    event.preventDefault();
    this.submitClicked.emit();
  }
}
```

Create `src/app/components/explanation-panel/explanation-panel.component.ts`:

```ts
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import type {
  BugHuntMatchResult,
  BugHuntMode,
  TimedRunSummary,
} from '../../features/bug-hunt/bug-hunt.types';

@Component({
  selector: 'app-explanation-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`
    .panel { border: 1px solid var(--qmd-border); border-radius: 12px; background: var(--qmd-surface); padding: 16px; display: flex; flex-direction: column; gap: 10px; }
    .result-correct { color: var(--qmd-success); }
    .result-wrong { color: var(--qmd-error); }
    ul { margin: 0; padding-left: 18px; }
  `],
  template: `
    <section class="panel" aria-live="polite" aria-labelledby="explanation-heading">
      <h2 id="explanation-heading">Explanation</h2>

      @if (mode() === 'practice' && latestResult()) {
        <p [class.result-correct]="latestResult()!.isCorrect" [class.result-wrong]="!latestResult()!.isCorrect">
          {{ latestResult()!.isCorrect ? 'Correct match' : 'Incorrect match' }}
        </p>
        <p>{{ latestResult()!.explanation }}</p>
        <button type="button" (click)="advanceRequested.emit()">Next Scenario</button>
      } @else if (mode() === 'practice' && practiceComplete()) {
        <p>Practice deck complete. Reset or switch modes to play again.</p>
      } @else if (mode() === 'timed' && timedSummary()) {
        <h3>Run Summary</h3>
        <p>Score {{ timedSummary()!.score }} · Best streak {{ timedSummary()!.bestStreak }}</p>
        @if (timedSummary()!.noMisses) {
          <p>No missed categories this run.</p>
        } @else {
          <ul>
            @for (item of timedSummary()!.mostMissedCategories; track item.category) {
              <li>{{ item.category }}: {{ item.misses }}</li>
            }
          </ul>
        }
      } @else {
        <p>Practice mode shows per-card explanations here. Timed mode shows the final summary when time expires.</p>
      }
    </section>
  `,
})
export class ExplanationPanelComponent {
  readonly mode = input.required<BugHuntMode>();
  readonly latestResult = input.required<BugHuntMatchResult | null>();
  readonly practiceComplete = input.required<boolean>();
  readonly timedSummary = input.required<TimedRunSummary | null>();
  readonly advanceRequested = output<void>();
}
```

Replace `src/app/pages/bug-hunt/bug-hunt.component.ts` with:

```ts
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { BugHuntHeaderComponent } from '../../components/bug-hunt-header/bug-hunt-header.component';
import { BugQueueComponent } from '../../components/bug-queue/bug-queue.component';
import { ExplanationPanelComponent } from '../../components/explanation-panel/explanation-panel.component';
import { FixPoolComponent } from '../../components/fix-pool/fix-pool.component';
import { MatchZoneComponent } from '../../components/match-zone/match-zone.component';
import { BugHuntStore } from '../../features/bug-hunt/bug-hunt.store';

@Component({
  selector: 'app-bug-hunt',
  imports: [
    BugHuntHeaderComponent,
    BugQueueComponent,
    ExplanationPanelComponent,
    FixPoolComponent,
    MatchZoneComponent,
  ],
  providers: [BugHuntStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`
    .page { display: flex; flex-direction: column; gap: 16px; }
    .intro { display: flex; flex-direction: column; gap: 6px; }
    h1 { margin: 0; font-size: 18px; font-weight: 600; color: var(--qmd-text-primary); }
    .subtitle { margin: 0; font-size: 13px; color: var(--qmd-text-muted); }
    .board { display: grid; grid-template-columns: 280px minmax(0, 1fr) 320px; gap: 16px; align-items: start; }
    .play-area { display: flex; flex-direction: column; gap: 16px; }
    .bug-card, .empty { border: 1px solid var(--qmd-border); border-radius: 12px; background: var(--qmd-surface); padding: 16px; }
    .meta { display: flex; gap: 8px; flex-wrap: wrap; color: var(--qmd-text-muted); font-size: 12px; }
  `],
  template: `
    <section class="page" aria-labelledby="bug-hunt-heading">
      <div class="intro">
        <h1 id="bug-hunt-heading">Bug Hunt Lab</h1>
        <p class="subtitle">Drag or keyboard-match each bug to the safest fix pattern.</p>
      </div>

      @if (store.emptyStateMessage()) {
        <section class="empty" role="status">
          <p>{{ store.emptyStateMessage() }}</p>
        </section>
      } @else {
        <app-bug-hunt-header
          [mode]="store.mode()"
          [score]="store.score()"
          [streak]="store.streak()"
          [bestStreak]="store.bestStreak()"
          [remainingSeconds]="store.remainingSeconds()"
          [timedRunning]="store.timedRunning()"
          [timedComplete]="store.timedComplete()"
          (modeChange)="store.setMode($event)"
          (startTimed)="store.startTimedRound()"
          (resetRound)="store.setMode(store.mode())"
        />

        <div class="board">
          <app-bug-queue
            [scenarios]="store.queue()"
            [activeScenarioId]="store.activeScenario()?.id ?? null"
          />

          <div class="play-area">
            <section class="bug-card" aria-labelledby="active-bug-heading">
              <h2 id="active-bug-heading">{{ store.activeScenario()?.title }}</h2>
              <p>{{ store.activeScenario()?.bugPattern }}</p>
              <p>{{ store.activeScenario()?.prompt }}</p>
              <div class="meta">
                <span>{{ store.activeScenario()?.category }}</span>
                <span>{{ store.activeScenario()?.difficulty }}</span>
              </div>
            </section>

            <app-fix-pool
              [fixes]="store.currentFixes()"
              [selectedFixId]="store.selectedFixId()"
              [disabled]="store.timedComplete() || store.practiceComplete()"
              (fixSelected)="store.selectFix($event)"
              (dragStarted)="store.beginDrag($event)"
            />

            <app-match-zone
              [selectedLabel]="selectedFixLabel()"
              [disabled]="store.practiceComplete() || (store.mode() === 'practice' && store.latestResult() !== null)"
              [draggedFixId]="store.draggedFixId()"
              (fixDropped)="store.submitFix($event)"
              (submitClicked)="store.submitFix()"
            />
          </div>

          <app-explanation-panel
            [mode]="store.mode()"
            [latestResult]="store.latestResult()"
            [practiceComplete]="store.practiceComplete()"
            [timedSummary]="store.timedSummary()"
            (advanceRequested)="store.advancePractice()"
          />
        </div>
      }
    </section>
  `,
})
export class BugHuntComponent {
  protected readonly store = inject(BugHuntStore);

  protected readonly selectedFixLabel = computed(() => {
    const selectedFixId = this.store.selectedFixId();
    return (
      this.store.currentFixes().find((fix) => fix.id === selectedFixId)?.label ??
      null
    );
  });
}
```

- [ ] **Step 4: Run the page-shell test again**

Run:

```bash
npm test -- --watch=false --include src/app/pages/bug-hunt/bug-hunt.component.spec.ts
```

Expected: exits `0`; the shared board layout and empty state render correctly.

- [ ] **Step 5: Commit the board layout slice**

Run:

```bash
git add src/app/components/bug-hunt-header/bug-hunt-header.component.ts src/app/components/bug-queue/bug-queue.component.ts src/app/components/fix-pool/fix-pool.component.ts src/app/components/match-zone/match-zone.component.ts src/app/components/explanation-panel/explanation-panel.component.ts src/app/pages/bug-hunt/bug-hunt.component.ts src/app/pages/bug-hunt/bug-hunt.component.spec.ts
git commit -m "feat: add Bug Hunt Lab board layout"
```

---

## Task 7: Add keyboard-first matching and timed summary integration coverage

**Files:**
- Modify: `src/app/pages/bug-hunt/bug-hunt.component.spec.ts`
- Modify: `src/app/pages/bug-hunt/bug-hunt.component.ts`
- Modify: `src/app/components/match-zone/match-zone.component.ts`
- Test: `src/app/pages/bug-hunt/bug-hunt.component.spec.ts`

- [ ] **Step 1: Add failing interaction tests**

Append these specs to `src/app/pages/bug-hunt/bug-hunt.component.spec.ts`:

```ts
import { fakeAsync, tick } from '@angular/core/testing';

describe('BugHuntComponent interactions', () => {
  it('supports keyboard-only matching in Practice mode', async () => {
    await TestBed.configureTestingModule({
      imports: [BugHuntComponent],
      providers: [{ provide: BUG_HUNT_SCENARIOS, useValue: TEST_SCENARIOS }],
    }).compileComponents();

    const fixture = TestBed.createComponent(BugHuntComponent);
    fixture.detectChanges();

    const fixButtons = Array.from(
      fixture.nativeElement.querySelectorAll('[data-testid="fix-option"]'),
    ) as HTMLButtonElement[];
    const correctButton = fixButtons.find((button) =>
      button.textContent?.includes('Return a new array reference'),
    )!;

    correctButton.focus();
    correctButton.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    fixture.detectChanges();

    const submitButton = fixture.nativeElement.querySelector(
      '[data-testid="submit-match"]',
    ) as HTMLButtonElement;
    submitButton.focus();
    submitButton.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(
      'Signals and OnPush updates are safest when state writes produce a new reference.',
    );
  });

  it('renders the timed run summary after the countdown expires', fakeAsync(async () => {
    await TestBed.configureTestingModule({
      imports: [BugHuntComponent],
      providers: [{ provide: BUG_HUNT_SCENARIOS, useValue: TEST_SCENARIOS }],
    }).compileComponents();

    const fixture = TestBed.createComponent(BugHuntComponent);
    fixture.detectChanges();

    const timedButton = fixture.nativeElement.querySelector(
      '[data-testid="mode-timed"]',
    ) as HTMLButtonElement;
    timedButton.click();
    fixture.detectChanges();

    const startButton = fixture.nativeElement.querySelector(
      '[data-testid="start-timed"]',
    ) as HTMLButtonElement;
    startButton.click();
    fixture.detectChanges();

    const wrongButton = Array.from(
      fixture.nativeElement.querySelectorAll('[data-testid="fix-option"]'),
    ).find((button: HTMLButtonElement) =>
      button.textContent?.includes('Mutate the existing array in place again'),
    ) as HTMLButtonElement;
    wrongButton.click();
    fixture.detectChanges();

    const submitButton = fixture.nativeElement.querySelector(
      '[data-testid="submit-match"]',
    ) as HTMLButtonElement;
    submitButton.click();
    fixture.detectChanges();

    tick(90000);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Run Summary');
    expect(fixture.nativeElement.textContent).toContain('frontend: 1');
  }));
});
```

- [ ] **Step 2: Run the interaction spec and verify it fails**

Run:

```bash
npm test -- --watch=false --include src/app/pages/bug-hunt/bug-hunt.component.spec.ts
```

Expected: FAIL because keyboard submission/timed summary rendering are not fully wired yet.

- [ ] **Step 3: Finish the page interaction wiring**

Update the `app-match-zone` bindings in `src/app/pages/bug-hunt/bug-hunt.component.ts` to prevent interaction after time expires and to clear drag state after a drop:

```ts
<app-match-zone
  [selectedLabel]="selectedFixLabel()"
  [disabled]="store.timedComplete() || (store.mode() === 'practice' && store.latestResult() !== null)"
  [draggedFixId]="store.draggedFixId()"
  (fixDropped)="submitDroppedFix($event)"
  (submitClicked)="store.submitFix()"
/>
```

Add this method to the component class:

```ts
protected submitDroppedFix(fixId: string): void {
  this.store.submitFix(fixId);
  this.store.clearDrag();
}
```

Update `src/app/components/match-zone/match-zone.component.ts` so the submit button is disabled only when there is no selected label or the board is disabled:

```ts
[disabled]="disabled() || !selectedLabel()"
```

Keep the explicit keyboard handlers in `FixPoolComponent` and `MatchZoneComponent`; do not replace them with pointer-only behavior just to satisfy the page spec.

- [ ] **Step 4: Run the interaction spec again**

Run:

```bash
npm test -- --watch=false --include src/app/pages/bug-hunt/bug-hunt.component.spec.ts
```

Expected: exits `0`; keyboard-only matching shows the explanation, and timed expiry renders the summary.

- [ ] **Step 5: Commit the interaction slice**

Run:

```bash
git add src/app/pages/bug-hunt/bug-hunt.component.ts src/app/pages/bug-hunt/bug-hunt.component.spec.ts src/app/components/match-zone/match-zone.component.ts
git commit -m "feat: finish Bug Hunt Lab interactions"
```

---

## Task 8: Run the full verification suite

**Files:** none

- [ ] **Step 1: Run the complete unit test suite**

Run:

```bash
npm test -- --watch=false
```

Expected: exits `0` with the existing specs plus the new Bug Hunt specs passing.

- [ ] **Step 2: Run the production build**

Run:

```bash
npm run build
```

Expected: exits `0` and prints Angular build completion output.

- [ ] **Step 3: Verify the working tree is ready for review**

Run:

```bash
git status --short
```

Expected: no unexpected unstaged changes remain after the Bug Hunt commits.

---

## Spec Coverage Check

- **Sidebar entry + `/bug-hunt` route:** Task 2
- **Shared board layout:** Tasks 2, 6, 7
- **Local typed scenario catalog:** Task 3
- **Route-scoped signal store:** Tasks 3, 4, 5
- **Practice explanations:** Tasks 4, 6, 7
- **Timed score/streak/timer/summary:** Tasks 5, 7
- **Keyboard-first matching:** Tasks 6, 7
- **Empty/malformed catalog state:** Tasks 3, 6
- **Planned test coverage:** Tasks 2 through 8

## Notes

- The current checkout does not have the local Angular CLI available until `npm ci` runs, so Task 1 is a required prerequisite before any build or test command.
- Keep the feature local to `src/app/features/bug-hunt/` and the Bug Hunt page/components; do not add API routes or persistence in this implementation.
- Keep the page shell and presentational components small. If a file starts growing multiple responsibilities during implementation, split before adding more behavior.
