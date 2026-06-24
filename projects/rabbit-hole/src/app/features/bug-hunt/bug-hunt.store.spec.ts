import { TestBed } from '@angular/core/testing';
import { Subject, of, throwError } from 'rxjs';
import { afterEach, vi } from 'vitest';
import { CodeRabbitReviewService } from '../../services/coderabbit-review.service';
import { BUG_HUNT_SCENARIOS } from './bug-hunt-scenarios';
import type { CodeRabbitReview } from './coderabbit-review.types';
import { TIMED_ROUND_SECONDS, BugHuntStore } from './bug-hunt.store';
import type { BugHuntScenario } from './bug-hunt.types';

const fakeAsync = (testBody: () => void) => () => {
  vi.useFakeTimers();
  testBody();
};

const tick = (milliseconds: number): void => {
  vi.advanceTimersByTime(milliseconds);
};

const TEST_SCENARIOS: readonly BugHuntScenario[] = [
  {
    id: 'stale-state',
    title: 'Stale list after update',
    bugPattern: 'A signal-backed list updates in memory but the template never refreshes.',
    category: 'frontend',
    difficulty: 'intro',
    prompt: 'Which fix should ship?',
    code: 'items.update(list => [...list, label])',
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
    code: 'const name = payload.user.profile.name;',
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

afterEach(() => {
  vi.useRealTimers();
});

describe('BugHuntStore catalog boot', () => {
  it('loads the first scenario and its fix pool from a valid catalog', () => {
    TestBed.configureTestingModule({
      providers: [
        BugHuntStore,
        { provide: BUG_HUNT_SCENARIOS, useValue: TEST_SCENARIOS },
        { provide: CodeRabbitReviewService, useValue: { requestReview: vi.fn() } },
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
        {
          provide: BUG_HUNT_SCENARIOS,
          useValue: [
            {
              id: 'broken',
              title: 'Broken scenario',
              bugPattern: 'Missing code field',
              category: 'frontend',
              difficulty: 'intro',
              prompt: 'Which fix should ship?',
              correctFix: { id: 'fix', label: 'Fix it' },
              distractorFixes: [
                { id: 'wrong-a', label: 'Wrong fix A' },
                { id: 'wrong-b', label: 'Wrong fix B' },
              ],
              explanation: 'Broken scenario should be rejected.',
            },
          ],
        },
        { provide: CodeRabbitReviewService, useValue: { requestReview: vi.fn() } },
      ],
    });

    const store = TestBed.inject(BugHuntStore);

    expect(store.activeScenario()).toBeNull();
    expect(store.currentFixes()).toEqual([]);
    expect(store.emptyStateMessage()).toContain('no playable scenarios');
  });
});

describe('BugHuntStore round reset', () => {
  it('clears timed flags, restores the first scenario fix pool, and resets round state when switching modes', () => {
    TestBed.configureTestingModule({
      providers: [
        BugHuntStore,
        { provide: BUG_HUNT_SCENARIOS, useValue: TEST_SCENARIOS },
        { provide: CodeRabbitReviewService, useValue: { requestReview: vi.fn() } },
      ],
    });

    const store = TestBed.inject(BugHuntStore);

    // Put the store into a non-default state across many signals
    store.activeIndex.set(1);
    store.currentFixes.set([
      TEST_SCENARIOS[1].correctFix,
      ...TEST_SCENARIOS[1].distractorFixes,
    ]);
    store.timedRunning.set(true);
    store.timedComplete.set(true);

    store.score.set(42);
    store.streak.set(3);
    store.bestStreak.set(7);
    store.remainingSeconds.set(12);
    store.totalMistakes.set(9);
    store.practiceComplete.set(true);
    store.latestResult.set({
      isCorrect: false,
      selectedFixId: 'non-existent',
      correctFixId: TEST_SCENARIOS[1].correctFix.id,
      explanation: 'dummy',
      category: 'backend',
    });
    store.timedSummary.set({
      score: 10,
      bestStreak: 2,
      totalMistakes: 1,
      mostMissedCategories: [{ category: 'frontend', misses: 2 }],
      noMisses: false,
      secondsUsed: 45,
    });
    store.missedCategories.set({ frontend: 2 });
    store.selectedFixId.set('some-fix');
    store.draggedFixId.set('dragged-fix');

    // Switch mode which triggers resetRoundState()
    store.setMode('timed');

    // Mode changed
    expect(store.mode()).toBe('timed');

    // Existing expectations: active scenario and fix pool restored
    expect(store.activeScenario()?.id).toBe('stale-state');
    expect(store.currentFixes().map((fix) => fix.id).sort()).toEqual(
      [
        TEST_SCENARIOS[0].correctFix.id,
        ...TEST_SCENARIOS[0].distractorFixes.map((fix) => fix.id),
      ].sort(),
    );

    // Timed flags cleared
    expect(store.timedRunning()).toBe(false);
    expect(store.timedComplete()).toBe(false);

    // New broader reset expectations
    expect(store.score()).toBe(0);
    expect(store.streak()).toBe(0);
    expect(store.bestStreak()).toBe(0);
    expect(store.remainingSeconds()).toBe(TIMED_ROUND_SECONDS);
    expect(store.totalMistakes()).toBe(0);
    expect(store.practiceComplete()).toBe(false);
    expect(store.latestResult()).toBeNull();
    expect(store.timedSummary()).toBeNull();
    expect(store.missedCategories()).toEqual({});
    expect(store.selectedFixId()).toBeNull();
    expect(store.draggedFixId()).toBeNull();
  });
});

describe('BugHuntStore practice mode', () => {
  let store: BugHuntStore;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        BugHuntStore,
        { provide: BUG_HUNT_SCENARIOS, useValue: TEST_SCENARIOS },
        { provide: CodeRabbitReviewService, useValue: { requestReview: vi.fn() } },
      ],
    });

    store = TestBed.inject(BugHuntStore);
  });

  it('scores a correct answer, keeps the current card visible, and waits for explicit advance', () => {
    store.selectFix('replace-array');
    store.submitFix();

    expect(store.score()).toBe(1);
    expect(store.streak()).toBe(1);
    expect(store.bestStreak()).toBe(1);
    expect(store.latestResult()?.isCorrect).toBe(true);
    expect(store.activeScenario()?.id).toBe('stale-state');

    store.advancePractice();

    expect(store.activeScenario()?.id).toBe('missing-null-guard');
    expect(store.latestResult()).toBeNull();
  });

  it('records an incorrect answer and counts the missed category', () => {
    store.selectFix('mutate-array');
    store.submitFix();

    expect(store.score()).toBe(0);
    expect(store.streak()).toBe(0);
    expect(store.totalMistakes()).toBe(1);
    expect(store.missedCategories()['frontend']).toBe(1);
    expect(store.latestResult()).toEqual(
      expect.objectContaining({
        isCorrect: false,
        selectedFixId: 'mutate-array',
        correctFixId: 'replace-array',
      }),
    );
  });

  it('resets round state when the player switches modes', () => {
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

describe('BugHuntStore timed mode', () => {
  it('allows a second timed submission after the first submission auto-advances', () => {
    TestBed.configureTestingModule({
      providers: [
        BugHuntStore,
        { provide: BUG_HUNT_SCENARIOS, useValue: TEST_SCENARIOS },
        { provide: CodeRabbitReviewService, useValue: { requestReview: vi.fn() } },
      ],
    });

    const store = TestBed.inject(BugHuntStore);

    store.setMode('timed');
    store.startTimedRound();
    store.selectFix('replace-array');
    store.submitFix();

    expect(store.score()).toBe(1);
    expect(store.activeScenario()?.id).toBe('missing-null-guard');

    store.selectFix('guard-input');
    store.submitFix();

    expect(store.score()).toBe(2);
    expect(store.timedComplete()).toBe(true);
    expect(store.timedRunning()).toBe(false);
  });

  it('ignores timed submissions until a timed run starts', () => {
    TestBed.configureTestingModule({
      providers: [
        BugHuntStore,
        { provide: BUG_HUNT_SCENARIOS, useValue: TEST_SCENARIOS },
        { provide: CodeRabbitReviewService, useValue: { requestReview: vi.fn() } },
      ],
    });

    const store = TestBed.inject(BugHuntStore);

    store.setMode('timed');
    store.selectFix('replace-array');
    store.submitFix();

    expect(store.score()).toBe(0);
    expect(store.latestResult()).toBeNull();
    expect(store.activeScenario()?.id).toBe('stale-state');
  });

  it('starts a 90 second round and counts down once per second', fakeAsync(() => {
    TestBed.configureTestingModule({
      providers: [
        BugHuntStore,
        { provide: BUG_HUNT_SCENARIOS, useValue: TEST_SCENARIOS },
        { provide: CodeRabbitReviewService, useValue: { requestReview: vi.fn() } },
      ],
    });

    const store = TestBed.inject(BugHuntStore);

    store.setMode('timed');
    store.startTimedRound();

    expect(store.remainingSeconds()).toBe(90);

    tick(1000);

    expect(store.remainingSeconds()).toBe(89);
  }));

  it('finishes the timed round when all scenarios are answered', () => {
    TestBed.configureTestingModule({
      providers: [
        BugHuntStore,
        { provide: BUG_HUNT_SCENARIOS, useValue: TEST_SCENARIOS.slice(0, 2) },
        { provide: CodeRabbitReviewService, useValue: { requestReview: vi.fn() } },
      ],
    });

    const store = TestBed.inject(BugHuntStore);

    store.setMode('timed');
    store.startTimedRound();
    store.submitFix('replace-array');
    store.submitFix('guard-input');

    expect(store.timedComplete()).toBe(true);
    expect(store.timedRunning()).toBe(false);
    expect(store.timedSummary()).not.toBeNull();
  });

  it('finalizes a timed summary with sorted missed categories', fakeAsync(() => {
    TestBed.configureTestingModule({
      providers: [
        BugHuntStore,
        { provide: BUG_HUNT_SCENARIOS, useValue: TEST_SCENARIOS },
        { provide: CodeRabbitReviewService, useValue: { requestReview: vi.fn() } },
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
      secondsUsed: 90,
    });
  }));

  it('submits the latest explicit selection after a dragged fix was previously chosen', () => {
    TestBed.configureTestingModule({
      providers: [
        BugHuntStore,
        { provide: BUG_HUNT_SCENARIOS, useValue: TEST_SCENARIOS },
        { provide: CodeRabbitReviewService, useValue: { requestReview: vi.fn() } },
      ],
    });

    const store = TestBed.inject(BugHuntStore);

    store.beginDrag('mutate-array');
    store.selectFix('replace-array');
    store.submitFix();

    expect(store.latestResult()).toEqual(
      expect.objectContaining({
        selectedFixId: 'replace-array',
        isCorrect: true,
      }),
    );
  });
});


describe('CodeRabbit review', () => {
  let mockReviewService: { requestReview: ReturnType<typeof vi.fn> };
  let store: BugHuntStore;

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

    store = TestBed.inject(BugHuntStore);
  });

  it('should set reviewResult on successful review', () => {
    mockReviewService.requestReview.mockReturnValue(of(mockReview));
    store.requestReview();
    expect(store.reviewLoading()).toBe(false);
    expect(store.reviewResult()).toEqual(mockReview);
    expect(mockReviewService.requestReview).toHaveBeenCalledWith(
      'stale-state',
      TEST_SCENARIOS[0].code,
      'scenario-stale-state.ts',
    );
  });

  it('should set reviewError on failure', () => {
    mockReviewService.requestReview.mockReturnValue(
      throwError(() => ({ error: { error: 'Review timed out, try again' } })),
    );
    store.requestReview();
    expect(store.reviewError()).toBe('Review timed out, try again');
    expect(store.reviewLoading()).toBe(false);
  });

  it('should not request review when already loading', () => {
    const pendingReview = new Subject<CodeRabbitReview>();
    mockReviewService.requestReview.mockReturnValue(pendingReview.asObservable());

    store.requestReview();
    store.requestReview();

    expect(mockReviewService.requestReview).toHaveBeenCalledTimes(1);

    pendingReview.next(mockReview);
    pendingReview.complete();
  });

  it('should reset review state when advancing to next scenario', () => {
    mockReviewService.requestReview.mockReturnValue(of(mockReview));
    store.requestReview();
    expect(store.reviewResult()).not.toBeNull();

    store.submitFix('replace-array');
    store.advancePractice();

    expect(store.reviewResult()).toBeNull();
    expect(store.reviewError()).toBeNull();
  });
});
