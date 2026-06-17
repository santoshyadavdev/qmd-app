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
