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
