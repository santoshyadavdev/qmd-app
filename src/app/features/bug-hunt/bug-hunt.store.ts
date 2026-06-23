import { Injectable, computed, inject, signal } from '@angular/core';
import { BUG_HUNT_SCENARIOS } from './bug-hunt-scenarios';
import type {
  BugFixOption,
  BugHuntCategory,
  BugHuntMatchResult,
  BugHuntMode,
  BugHuntScenario,
  TimedRunSummary,
} from './bug-hunt.types';

export const TIMED_ROUND_SECONDS = 90;

interface CatalogValidation {
  scenarios: readonly BugHuntScenario[];
  error: string | null;
}

@Injectable()
export class BugHuntStore {
  private readonly rawCatalog = inject(BUG_HUNT_SCENARIOS);
  private readonly catalog = this.validateCatalog(this.rawCatalog);
  private timerId: ReturnType<typeof setInterval> | null = null;

  readonly mode = signal<BugHuntMode>('practice');
  readonly activeIndex = signal(0);
  readonly currentFixes = signal<BugFixOption[]>([]);
  readonly selectedFixId = signal<string | null>(null);
  readonly draggedFixId = signal<string | null>(null);
  readonly score = signal(0);
  readonly streak = signal(0);
  readonly bestStreak = signal(0);
  readonly remainingSeconds = signal(TIMED_ROUND_SECONDS);
  readonly totalMistakes = signal(0);
  readonly practiceComplete = signal(false);
  readonly latestResult = signal<BugHuntMatchResult | null>(null);
  readonly timedSummary = signal<TimedRunSummary | null>(null);
  readonly missedCategories = signal<Partial<Record<BugHuntCategory, number>>>({});
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
    this.draggedFixId.set(null);
  }

  beginDrag(fixId: string): void {
    this.draggedFixId.set(fixId);
  }

  clearDrag(): void {
    this.draggedFixId.set(null);
  }

  setMode(mode: BugHuntMode): void {
    this.stopTimer();
    this.mode.set(mode);
    this.timedRunning.set(false);
    this.timedComplete.set(false);
    this.resetRoundState();
  }

  submitFix(fixId = this.selectedFixId() ?? this.draggedFixId() ?? ''): void {
    const scenario = this.activeScenario();
    if (
      !scenario ||
      !fixId ||
      this.practiceComplete() ||
      (this.mode() === 'practice' && this.latestResult() !== null) ||
      (this.mode() === 'timed' && !this.timedRunning()) ||
      this.timedComplete()
    ) {
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
      this.latestResult.set(null);
      this.selectedFixId.set(null);
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

  startTimedRound(): void {
    if (this.mode() !== 'timed' || this.scenarios().length === 0) {
      return;
    }

    this.resetRoundState();
    this.mode.set('timed');
    this.timedRunning.set(true);
    this.timedComplete.set(false);
    this.remainingSeconds.set(TIMED_ROUND_SECONDS);

    this.timerId = setInterval(() => {
      const nextValue = this.remainingSeconds() - 1;
      this.remainingSeconds.set(nextValue);

      if (nextValue <= 0) {
        this.finishTimedRound();
      }
    }, 1000);
  }

  private resetRoundState(): void {
    this.stopTimer();
    this.activeIndex.set(0);
    this.refreshFixes();
    this.selectedFixId.set(null);
    this.draggedFixId.set(null);
    this.score.set(0);
    this.streak.set(0);
    this.bestStreak.set(0);
    this.remainingSeconds.set(TIMED_ROUND_SECONDS);
    this.totalMistakes.set(0);
    this.practiceComplete.set(false);
    this.latestResult.set(null);
    this.timedSummary.set(null);
    this.missedCategories.set({});
    this.timedRunning.set(false);
    this.timedComplete.set(false);
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
      secondsUsed: TIMED_ROUND_SECONDS - this.remainingSeconds(),
    });
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

  private stopTimer(): void {
    if (this.timerId !== null) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }

  private advanceToNextScenario(): void {
    const scenarios = this.scenarios();
    if (scenarios.length === 0) {
      return;
    }

    const nextIndex = this.activeIndex() + 1;
    if (nextIndex < scenarios.length) {
      this.activeIndex.set(nextIndex);
      this.refreshFixes();
    } else if (this.mode() === 'timed') {
      this.finishTimedRound();
    } else {
      this.activeIndex.set(0);
      this.refreshFixes();
    }
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
