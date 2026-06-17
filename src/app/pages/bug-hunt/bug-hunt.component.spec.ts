import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { BugHuntComponent } from './bug-hunt.component';
import { BUG_HUNT_SCENARIOS } from '../../features/bug-hunt/bug-hunt-scenarios';
import type { BugHuntScenario } from '../../features/bug-hunt/bug-hunt.types';

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
        providers: [{ provide: BUG_HUNT_SCENARIOS, useValue: [staleStateScenario] }],
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
        providers: [{ provide: BUG_HUNT_SCENARIOS, useValue: [] }],
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
});
