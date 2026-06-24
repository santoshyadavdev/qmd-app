import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { afterEach, vi } from 'vitest';
import { BugHuntComponent } from './bug-hunt.component';
import { CodeRabbitReviewService } from '../../services/coderabbit-review.service';
import { BUG_HUNT_SCENARIOS } from '../../features/bug-hunt/bug-hunt-scenarios';
import type { BugHuntScenario } from '../../features/bug-hunt/bug-hunt.types';

const fakeAsync = (testBody: () => Promise<void> | void) => async () => {
  vi.useFakeTimers();
  await testBody();
};

const tick = (milliseconds: number): void => {
  vi.advanceTimersByTime(milliseconds);
};

const timedScenarioFixture: readonly BugHuntScenario[] = [
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
    explanation:
      'Signals and OnPush updates are safest when state writes produce a new reference.',
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
    explanation:
      'Validate the contract at the edge and fail explicitly instead of crashing deeper in the flow.',
  },
];

afterEach(() => {
  vi.useRealTimers();
});

describe('BugHuntComponent', () => {
  let component: BugHuntComponent;
  let fixture: ComponentFixture<BugHuntComponent>;

  const staleStateScenario: BugHuntScenario = {
    id: 'stale-state',
    title: 'Stale State After Mutation',
    bugPattern: 'State mutation without change detection',
    category: 'frontend',
    difficulty: 'intro',
    prompt: 'Fix the stale state issue',
    code: 'items.set(list);',
    correctFix: {
      id: 'replace-array',
      label: 'Replace array reference',
    },
    distractorFixes: [
      { id: 'mutate-array', label: 'Mutate array in place' },
      { id: 'manual-detect', label: 'Manual change detection' },
    ],
    explanation:
      'Signals and OnPush updates are safest when state writes produce a new reference.',
  };

  describe('with one scenario', () => {
    beforeEach(async () => {
      await TestBed.configureTestingModule({
        imports: [BugHuntComponent],
        providers: [
          { provide: BUG_HUNT_SCENARIOS, useValue: [staleStateScenario] },
          { provide: CodeRabbitReviewService, useValue: { requestReview: vi.fn() } },
        ],
      }).compileComponents();

      fixture = TestBed.createComponent(BugHuntComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
    });

    it('should render shared Bug Hunt board layout', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const text = compiled.textContent || '';

      expect(text).toContain('Bug Hunt Lab');
      expect(text).toContain('Practice');
      expect(text).toContain('Timed');
      expect(text).toContain('Bug Queue');
      expect(text).toContain('Fix Pool');
      expect(text).toContain('Drop Zone');
    });

    it('keeps timed mode interactions disabled until the timed run starts', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const timedButton = Array.from(compiled.querySelectorAll('button')).find((button) =>
        button.textContent?.includes('Timed'),
      ) as HTMLButtonElement;

      timedButton.click();
      fixture.detectChanges();

      const fixButtons = Array.from(
        compiled.querySelectorAll('[data-testid="fix-option"]'),
      ) as HTMLButtonElement[];
      const submitButton = compiled.querySelector(
        '[data-testid="submit-match"]',
      ) as HTMLButtonElement;

      expect(compiled.textContent).toContain('Start Timed Run');
      expect(fixButtons.every((button) => button.disabled)).toBe(true);
      expect(submitButton.disabled).toBe(true);
    });

    it('marks the selected fix with aria-pressed', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const correctButton = Array.from(
        compiled.querySelectorAll('[data-testid="fix-option"]'),
      ).find((button) =>
        button.textContent?.includes('Replace array reference'),
      ) as HTMLButtonElement;

      correctButton.click();
      fixture.detectChanges();

      expect(correctButton.getAttribute('aria-pressed')).toBe('true');
    });

    it('announces explanation updates in a polite live region', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const fixButtons = Array.from(
        compiled.querySelectorAll('[data-testid="fix-option"]'),
      ) as HTMLButtonElement[];
      const correctButton = fixButtons.find((button) =>
        button.textContent?.includes('Replace array reference'),
      ) as HTMLButtonElement;
      const submitButton = compiled.querySelector(
        '[data-testid="submit-match"]',
      ) as HTMLButtonElement;

      correctButton.click();
      submitButton.click();
      fixture.detectChanges();

      const explanationPanel = compiled.querySelector('.explanation-panel');
      expect(explanationPanel?.getAttribute('aria-live')).toBe('polite');
    });
  });

  describe('with empty scenario provider', () => {
    beforeEach(async () => {
      await TestBed.configureTestingModule({
        imports: [BugHuntComponent],
        providers: [
          { provide: BUG_HUNT_SCENARIOS, useValue: [] },
          { provide: CodeRabbitReviewService, useValue: { requestReview: vi.fn() } },
        ],
      }).compileComponents();

      fixture = TestBed.createComponent(BugHuntComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
    });

    it('should render empty state message', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const text = compiled.textContent || '';

      expect(text).toContain('Bug Hunt Lab has no playable scenarios available.');
    });
  });

  describe('interactions', () => {
    beforeEach(async () => {
      await TestBed.configureTestingModule({
        imports: [BugHuntComponent],
        providers: [
          { provide: BUG_HUNT_SCENARIOS, useValue: timedScenarioFixture },
          { provide: CodeRabbitReviewService, useValue: { requestReview: vi.fn() } },
        ],
      }).compileComponents();

      fixture = TestBed.createComponent(BugHuntComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
    });

    it('supports keyboard-only matching in Practice mode', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const fixButtons = Array.from(
        compiled.querySelectorAll('[data-testid="fix-option"]'),
      ) as HTMLButtonElement[];
      const correctButton = fixButtons.find((button) =>
        button.textContent?.includes('Return a new array reference from the state update'),
      ) as HTMLButtonElement;

      correctButton.focus();
      correctButton.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
      fixture.detectChanges();

      const submitButton = compiled.querySelector(
        '[data-testid="submit-match"]',
      ) as HTMLButtonElement;
      submitButton.focus();
      submitButton.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
      fixture.detectChanges();

      expect(compiled.textContent).toContain(
        'Signals and OnPush updates are safest when state writes produce a new reference.',
      );
    });

    it('submits a dropped fix immediately in Practice mode', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const fixButtons = Array.from(
        compiled.querySelectorAll('[data-testid="fix-option"]'),
      ) as HTMLButtonElement[];
      const correctButton = fixButtons.find((button) =>
        button.textContent?.includes('Return a new array reference from the state update'),
      ) as HTMLButtonElement;
      const matchZone = compiled.querySelector('.match-zone') as HTMLElement;

      correctButton.dispatchEvent(new Event('dragstart', { bubbles: true }));
      fixture.detectChanges();
      matchZone.dispatchEvent(new Event('drop', { bubbles: true, cancelable: true }));
      fixture.detectChanges();

      expect(compiled.textContent).toContain(
        'Signals and OnPush updates are safest when state writes produce a new reference.',
      );
    });

    it('renders the timed run summary after the countdown expires', fakeAsync(() => {
      const compiled = fixture.nativeElement as HTMLElement;
      const timedButton = Array.from(compiled.querySelectorAll('button')).find((button) =>
        button.textContent?.includes('Timed'),
      ) as HTMLButtonElement;
      timedButton.click();
      fixture.detectChanges();

      const startButton = Array.from(compiled.querySelectorAll('button')).find((button) =>
        button.textContent?.includes('Start Timed Run'),
      ) as HTMLButtonElement;
      startButton.click();
      fixture.detectChanges();

      const wrongButton = Array.from(
        compiled.querySelectorAll('[data-testid="fix-option"]'),
      ).find((button) =>
        button.textContent?.includes('Mutate the existing array in place again'),
      ) as HTMLButtonElement;
      wrongButton.click();
      fixture.detectChanges();

      const submitButton = compiled.querySelector(
        '[data-testid="submit-match"]',
      ) as HTMLButtonElement;
      submitButton.click();
      fixture.detectChanges();

      tick(90000);
      fixture.detectChanges();

      expect(compiled.textContent).toContain('Run Summary');
      expect(compiled.textContent).toContain('frontend: 1');
    }));
  });
});
