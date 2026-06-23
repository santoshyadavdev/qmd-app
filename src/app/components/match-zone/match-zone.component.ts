import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-match-zone',
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section
      class="match-zone"
      (dragover)="onDragOver($event)"
      (drop)="onDrop($event)">
      <h2>Drop Zone</h2>
      <div class="drop-area">
        @if (selectedLabel()) {
          <p class="selected-label">{{ selectedLabel() }}</p>
        } @else {
          <p class="helper-text">Select or drag a fix here</p>
        }
      </div>
      <button
        type="button"
        data-testid="submit-match"
        [disabled]="disabled() || !selectedLabel()"
        (click)="submitClicked.emit()"
        (keydown.enter)="onKeyDown($any($event))"
        (keydown.space)="onKeyDown($any($event))">
        Confirm Match
      </button>
    </section>
  `,
  styles: `
    .match-zone {
      padding: 1rem;
      border: 2px dashed rgba(255, 255, 255, 0.2);
      min-height: 150px;
    }

    .match-zone h2 {
      margin-top: 0;
    }

    .drop-area {
      padding: 2rem;
      border: 1px solid rgba(255, 255, 255, 0.12);
      background: rgba(255, 255, 255, 0.04);
      text-align: center;
      margin-bottom: 1rem;
    }

    .selected-label {
      font-weight: bold;
      margin: 0;
      color: var(--qmd-text-primary);
    }

    .helper-text {
      color: var(--qmd-text-secondary);
      margin: 0;
    }

    button {
      padding: 0.75rem 1.5rem;
      border: 1px solid #007bff;
      background: #007bff;
      color: white;
      cursor: pointer;
      font-weight: bold;
    }

    button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  `,
})
export class MatchZoneComponent {
  readonly selectedLabel = input<string | null>(null);
  readonly disabled = input<boolean>(false);
  readonly draggedFixId = input<string | null>(null);

  readonly fixDropped = output<string>();
  readonly submitClicked = output<void>();

  onDragOver(event: DragEvent): void {
    event.preventDefault();
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    const draggedId = this.draggedFixId();
    if (draggedId) {
      this.fixDropped.emit(draggedId);
    }
  }

  onKeyDown(event: KeyboardEvent): void {
    event.preventDefault();
    this.submitClicked.emit();
  }
}
