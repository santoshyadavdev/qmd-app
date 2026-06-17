import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';
import type { BugFixOption } from '../../features/bug-hunt/bug-hunt.types';

@Component({
  selector: 'app-fix-pool',
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="fix-pool">
      <h2>Fix Pool</h2>
      <div class="fixes">
        @for (fix of fixes(); track fix.id) {
          <button
            type="button"
            data-testid="fix-option"
            [class.selected]="fix.id === selectedFixId()"
            [attr.aria-pressed]="fix.id === selectedFixId()"
            [draggable]="!disabled()"
            [disabled]="disabled()"
            (click)="fixSelected.emit(fix.id)"
            (keydown.enter)="onKeyDown($any($event), fix.id)"
            (keydown.space)="onKeyDown($any($event), fix.id)"
            (dragstart)="dragStarted.emit(fix.id)">
            {{ fix.label }}
          </button>
        }
      </div>
    </section>
  `,
  styles: `
    .fix-pool {
      padding: 1rem;
    }

    .fix-pool h2 {
      margin-top: 0;
    }

    .fixes {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .fixes button {
      padding: 1rem;
      border: 2px solid #ccc;
      background: white;
      cursor: pointer;
      text-align: left;
    }

    .fixes button:not(:disabled):hover {
      background: #f0f0f0;
    }

    .fixes button.selected {
      border-color: #007bff;
      background: #e7f3ff;
    }

    .fixes button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  `,
})
export class FixPoolComponent {
  readonly fixes = input.required<readonly BugFixOption[]>();
  readonly selectedFixId = input<string | null>(null);
  readonly disabled = input<boolean>(false);

  readonly fixSelected = output<string>();
  readonly dragStarted = output<string>();

  onKeyDown(event: KeyboardEvent, fixId: string): void {
    event.preventDefault();
    this.fixSelected.emit(fixId);
  }
}
