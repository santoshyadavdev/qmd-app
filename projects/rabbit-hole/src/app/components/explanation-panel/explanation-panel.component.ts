import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';
import type {
  BugHuntMode,
  BugHuntMatchResult,
  TimedRunSummary,
} from '../../features/bug-hunt/bug-hunt.types';
import type { CodeRabbitReview } from '../../features/bug-hunt/coderabbit-review.types';

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

          @if (reviewResult()) {
            <div class="coderabbit-review">
              <h4>CodeRabbit Review</h4>
              <p class="review-summary">{{ reviewResult()!.summary }}</p>
              @if (reviewResult()!.comments.length > 0) {
                <ul class="review-comments" aria-label="Review comments">
                  @for (comment of reviewResult()!.comments; track comment.line) {
                    <li>
                      <span class="comment-severity" [attr.data-severity]="comment.severity">{{ comment.severity }}</span>
                      <span class="comment-line">Line {{ comment.line }}:</span>
                      <span class="comment-message">{{ comment.message }}</span>
                    </li>
                  }
                </ul>
              }
            </div>
          } @else if (reviewLoading()) {
            <div class="review-loading" role="status" aria-label="Loading review">
              <p>CodeRabbit is reviewing this code…</p>
            </div>
          } @else if (reviewError()) {
            <div class="review-error" role="alert">
              <p>{{ reviewError() }}</p>
              <button type="button" (click)="reviewRequested.emit()" aria-label="Retry CodeRabbit review">
                Retry
              </button>
            </div>
          } @else {
            <p>{{ latestResult()!.explanation }}</p>
            <button
              type="button"
              class="review-button"
              (click)="reviewRequested.emit()"
              aria-label="Get CodeRabbit review for this bug">
              Get CodeRabbit Review
            </button>
          }

          <button type="button" class="advance-button" (click)="advanceRequested.emit()">Next Scenario</button>
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

    .advance-button {
      margin-top: 1rem;
      padding: 0.5rem 1rem;
      border: 1px solid #007bff;
      background: #007bff;
      color: white;
      cursor: pointer;
    }

    .review-button {
      margin-top: 0.75rem;
      padding: 0.5rem 1rem;
      border: 1px solid #8b5cf6;
      background: #8b5cf6;
      color: white;
      cursor: pointer;
    }

    .coderabbit-review {
      margin-top: 1rem;
      padding: 0.75rem;
      border: 1px solid #8b5cf6;
      border-radius: 4px;
      background: rgba(139, 92, 246, 0.08);
    }

    .coderabbit-review h4 {
      margin: 0 0 0.5rem;
      color: #8b5cf6;
    }

    .review-summary {
      margin: 0 0 0.5rem;
      font-style: italic;
    }

    .review-comments {
      list-style: none;
      padding: 0;
      margin: 0;
    }

    .review-comments li {
      padding: 0.5rem 0;
      border-top: 1px solid rgba(139, 92, 246, 0.2);
      display: flex;
      gap: 0.5rem;
      align-items: baseline;
      flex-wrap: wrap;
    }

    .comment-severity {
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      padding: 0.125rem 0.375rem;
      border-radius: 3px;
      background: rgba(139, 92, 246, 0.2);
    }

    .comment-severity[data-severity="warning"] {
      background: rgba(251, 191, 36, 0.2);
      color: #d97706;
    }

    .comment-severity[data-severity="error"] {
      background: rgba(239, 68, 68, 0.2);
      color: #dc2626;
    }

    .comment-line {
      font-family: monospace;
      font-size: 0.85rem;
      opacity: 0.7;
    }

    .review-loading {
      margin-top: 0.75rem;
      padding: 0.75rem;
      background: rgba(139, 92, 246, 0.05);
      border-radius: 4px;
    }

    .review-error {
      margin-top: 0.75rem;
      padding: 0.75rem;
      background: rgba(239, 68, 68, 0.05);
      border: 1px solid rgba(239, 68, 68, 0.2);
      border-radius: 4px;
    }

    .review-error button {
      margin-top: 0.5rem;
      padding: 0.375rem 0.75rem;
      border: 1px solid #ef4444;
      background: transparent;
      color: #ef4444;
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
  readonly reviewLoading = input<boolean>(false);
  readonly reviewResult = input<CodeRabbitReview | null>(null);
  readonly reviewError = input<string | null>(null);

  readonly advanceRequested = output<void>();
  readonly reviewRequested = output<void>();
}
