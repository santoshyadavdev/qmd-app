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
