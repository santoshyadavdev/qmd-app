import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';
import type { BugHuntMode } from '../../features/bug-hunt/bug-hunt.types';

@Component({
  selector: 'app-bug-hunt-header',
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="bug-hunt-header">
      <div class="mode-selector">
        <button
          type="button"
          [class.active]="mode() === 'practice'"
          (click)="modeChange.emit('practice')"
          [attr.aria-pressed]="mode() === 'practice'">
          Practice
        </button>
        <button
          type="button"
          [class.active]="mode() === 'timed'"
          (click)="modeChange.emit('timed')"
          [attr.aria-pressed]="mode() === 'timed'">
          Timed
        </button>
      </div>

      <div class="stats">
        <span class="score">Score: {{ score() }}</span>
        <span class="streak">Streak: {{ streak() }}</span>
        <span class="best">Best: {{ bestStreak() }}</span>
        @if (timedRunning()) {
          <span class="timer">Time: {{ remainingSeconds() }}s</span>
        }
      </div>

      <div class="actions">
        @if (mode() === 'timed' && !timedRunning() && !timedComplete()) {
          <button type="button" (click)="startTimed.emit()">Start Timed Run</button>
        }
        <button type="button" (click)="resetRound.emit()">Reset</button>
      </div>
    </header>
  `,
  styles: `
    .bug-hunt-header {
      display: flex;
      gap: 1rem;
      align-items: center;
      padding: 1rem;
      border-bottom: 1px solid #ccc;
    }

    .mode-selector {
      display: flex;
      gap: 0.5rem;
    }

    .mode-selector button {
      padding: 0.5rem 1rem;
      border: 1px solid #ccc;
      background: white;
      cursor: pointer;
    }

    .mode-selector button.active {
      background: #007bff;
      color: white;
      border-color: #007bff;
    }

    .stats {
      display: flex;
      gap: 1rem;
      margin-left: auto;
    }

    .actions {
      display: flex;
      gap: 0.5rem;
    }

    .actions button {
      padding: 0.5rem 1rem;
      border: 1px solid #ccc;
      background: white;
      cursor: pointer;
    }
  `,
})
export class BugHuntHeaderComponent {
  readonly mode = input.required<BugHuntMode>();
  readonly score = input.required<number>();
  readonly streak = input.required<number>();
  readonly bestStreak = input.required<number>();
  readonly remainingSeconds = input.required<number>();
  readonly timedRunning = input.required<boolean>();
  readonly timedComplete = input.required<boolean>();

  readonly modeChange = output<BugHuntMode>();
  readonly startTimed = output<void>();
  readonly resetRound = output<void>();
}
