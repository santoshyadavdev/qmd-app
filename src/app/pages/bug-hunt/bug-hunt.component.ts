import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
} from '@angular/core';
import { BugHuntStore } from '../../features/bug-hunt/bug-hunt.store';
import { BugHuntHeaderComponent } from '../../components/bug-hunt-header/bug-hunt-header.component';
import { BugQueueComponent } from '../../components/bug-queue/bug-queue.component';
import { FixPoolComponent } from '../../components/fix-pool/fix-pool.component';
import { MatchZoneComponent } from '../../components/match-zone/match-zone.component';
import { ExplanationPanelComponent } from '../../components/explanation-panel/explanation-panel.component';

@Component({
  selector: 'app-bug-hunt',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [BugHuntStore],
  imports: [
    BugHuntHeaderComponent,
    BugQueueComponent,
    FixPoolComponent,
    MatchZoneComponent,
    ExplanationPanelComponent,
  ],
  styles: [
    `
      .page {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      h1 {
        margin: 0;
        font-size: 18px;
        font-weight: 600;
        color: var(--qmd-text-primary);
      }
      p {
        margin: 0;
        font-size: 13px;
        color: var(--qmd-text-muted);
      }
      .empty-state {
        padding: 2rem;
        text-align: center;
        border: 1px solid #ccc;
        background: #f9f9f9;
      }
      .board {
        display: grid;
        grid-template-columns: 1fr 2fr 1fr;
        gap: 1rem;
        margin-top: 1rem;
      }
      .bug-card {
        grid-column: 2;
        padding: 1rem;
        border: 2px solid #007bff;
        background: white;
      }
      .bug-card h2 {
        margin-top: 0;
      }
    `,
  ],
  template: `
    <section class="page" aria-labelledby="bug-hunt-heading">
      <h1 id="bug-hunt-heading">Bug Hunt Lab</h1>
      <p>Match each bug to the safest fix.</p>

      @if (store.emptyStateMessage()) {
        <div class="empty-state" role="status">
          <p>{{ store.emptyStateMessage() }}</p>
        </div>
      } @else {
        <app-bug-hunt-header
          [mode]="store.mode()"
          [score]="store.score()"
          [streak]="store.streak()"
          [bestStreak]="store.bestStreak()"
          [remainingSeconds]="store.remainingSeconds()"
          [timedRunning]="store.timedRunning()"
          [timedComplete]="store.timedComplete()"
          (modeChange)="store.setMode($event)"
          (startTimed)="store.startTimedRound()"
          (resetRound)="store.setMode(store.mode())" />

        <div class="board">
          @if (store.activeScenario(); as scenario) {
            <app-bug-queue
              [scenarios]="store.queue()"
              [activeScenarioId]="scenario.id" />
            <div class="bug-card">
              <h2>{{ scenario.title }}</h2>
              <p><strong>Bug Pattern:</strong> {{ scenario.bugPattern }}</p>
              <p><strong>Prompt:</strong> {{ scenario.prompt }}</p>
              <p>
                <strong>Category:</strong> {{ scenario.category }} |
                <strong>Difficulty:</strong> {{ scenario.difficulty }}
              </p>
            </div>

            <app-fix-pool
              [fixes]="store.currentFixes()"
              [selectedFixId]="store.selectedFixId()"
              [disabled]="interactionsDisabled()"
              (fixSelected)="store.selectFix($event)"
              (dragStarted)="store.beginDrag($event)" />

            <app-match-zone
              [selectedLabel]="selectedFixLabel()"
              [disabled]="interactionsDisabled()"
              [draggedFixId]="store.draggedFixId()"
              (fixDropped)="submitDroppedFix($event)"
              (submitClicked)="store.submitFix()" />

            <app-explanation-panel
              [mode]="store.mode()"
              [latestResult]="store.latestResult()"
              [practiceComplete]="store.practiceComplete()"
              [timedSummary]="store.timedSummary()"
              (advanceRequested)="store.advancePractice()" />
          }
        </div>
      }
    </section>
  `,
})
export class BugHuntComponent {
  readonly store = inject(BugHuntStore);
  private readonly destroyRef = inject(DestroyRef);

  readonly selectedFixLabel = computed(() => {
    const selectedId = this.store.selectedFixId();
    const fixes = this.store.currentFixes();
    const selected = fixes.find((fix) => fix.id === selectedId);
    return selected?.label ?? null;
  });

  readonly interactionsDisabled = computed(() =>
    this.store.practiceComplete() ||
    (this.store.mode() === 'practice' && this.store.latestResult() !== null) ||
    (this.store.mode() === 'timed' && !this.store.timedRunning() && !this.store.timedComplete()) ||
    this.store.timedComplete(),
  );

  constructor() {
    this.destroyRef.onDestroy(() => {
      if (this.store.timedRunning()) {
        this.store.setMode(this.store.mode());
      }
    });
  }

  protected submitDroppedFix(fixId: string): void {
    this.store.submitFix(fixId);
    this.store.clearDrag();
  }
}
