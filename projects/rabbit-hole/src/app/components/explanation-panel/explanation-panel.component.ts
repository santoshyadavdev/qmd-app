import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';
import type {
  BugHuntMode,
  BugHuntMatchResult,
  TimedRunSummary,
} from '../../features/bug-hunt/bug-hunt.types';

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
          <p>{{ latestResult()!.explanation }}</p>
          <button type="button" (click)="advanceRequested.emit()">Next Scenario</button>
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

    .result button {
      padding: 0.5rem 1rem;
      border: 1px solid #007bff;
      background: #007bff;
      color: white;
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

  readonly advanceRequested = output<void>();
}
