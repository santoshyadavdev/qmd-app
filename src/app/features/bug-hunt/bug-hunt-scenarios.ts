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
    codeSnippet: `@Component({ changeDetection: ChangeDetectionStrategy.OnPush })
export class TodoListComponent {
  items = signal<string[]>([]);

  addItem(label: string): void {
    const list = this.items();
    list.push(label);       // ❌ mutates in place
    this.items.set(list);   // same reference — no update triggered
  }
}`,
    correctFix: {
      id: 'replace-array',
      label: 'Use items.update(list => [...list, label]) to produce a new reference',
    },
    distractorFixes: [
      { id: 'mutate-array', label: 'Call items.set() after every push without changing the reference' },
      { id: 'manual-detect', label: 'Inject ChangeDetectorRef and call markForCheck() after every push' },
    ],
    explanation: 'Signals only notify subscribers when the reference changes. Use update() or spread to produce a new array instead of mutating in place.',
  },
  {
    id: 'subscription-leak',
    title: 'Observable subscription leaks on destroy',
    bugPattern: 'A component subscribes to an HTTP stream in the constructor but never unsubscribes, leaking memory on every navigation.',
    category: 'frontend',
    difficulty: 'intermediate',
    prompt: 'Which fix should ship?',
    codeSnippet: `@Component({ ... })
export class DashboardComponent {
  items: Item[] = [];

  constructor(private svc: ItemService) {
    // ❌ never unsubscribed — runs after component is destroyed
    this.svc.getItems().subscribe(data => {
      this.items = data;
    });
  }
}`,
    correctFix: {
      id: 'take-until-destroyed',
      label: 'Pipe through takeUntilDestroyed() so Angular cancels the subscription on destroy',
    },
    distractorFixes: [
      { id: 'unsubscribe-ngoninit', label: 'Move the subscribe() call from constructor to ngOnInit' },
      { id: 'complete-subject', label: 'Add a manual Subject and call complete() in every component' },
    ],
    explanation: "takeUntilDestroyed() from @angular/core/rxjs-interop ties the subscription lifetime to the component's DestroyRef — no boilerplate Subject needed.",
  },
  {
    id: 'missing-button-name',
    title: 'Icon-only button has no accessible name',
    bugPattern: 'A visual button exists, but assistive technology announces it as an unlabeled control.',
    category: 'accessibility',
    difficulty: 'intro',
    prompt: 'Which fix should ship?',
    codeSnippet: `<!-- ❌ screen readers announce "button" with no context -->
<button type="button" (click)="deleteItem(item)">
  <ng-icon name="heroTrash" aria-hidden="true" />
</button>`,
    correctFix: {
      id: 'add-accessible-name',
      label: 'Add aria-label="Delete <item name>" that describes the action',
    },
    distractorFixes: [
      { id: 'wrap-span', label: 'Wrap the icon in a <span> and keep the same markup' },
      { id: 'aria-hidden-button', label: 'Set aria-hidden="true" on the button to hide it from assistive technology' },
    ],
    explanation: 'Interactive controls need an accessible name so screen-reader users know what they activate. aria-label or a visually-hidden <span> both work; hiding the button entirely removes functionality for AT users.',
  },
];

export const BUG_HUNT_SCENARIOS = new InjectionToken<readonly unknown[]>(
  'BUG_HUNT_SCENARIOS',
  {
    factory: () => DEFAULT_BUG_HUNT_SCENARIOS,
  },
);
