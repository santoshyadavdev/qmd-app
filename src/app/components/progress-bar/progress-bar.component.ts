import { Component, input, computed, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-progress-bar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`
    .wrapper { display: flex; flex-direction: column; gap: 4px; }
    .bar-track { background: rgba(255,255,255,0.08); border-radius: 4px; height: 6px; overflow: hidden; }
    .bar-fill { height: 100%; background: var(--qmd-gradient); border-radius: 4px; transition: width 0.3s ease; }
    .label { display: flex; justify-content: space-between; }
    span { color: var(--qmd-text-muted); font-size: 11px; }
  `],
  template: `
    <div class="wrapper" role="progressbar" [attr.aria-valuenow]="current()" [attr.aria-valuemax]="total()" [attr.aria-label]="labelText()">
      <div class="bar-track"><div class="bar-fill" [style.width.%]="pct()"></div></div>
      <div class="label" aria-hidden="true">
        <span>{{ file() }}</span>
        <span>{{ current() }} / {{ total() }}</span>
      </div>
    </div>
  `,
})
export class ProgressBarComponent {
  readonly current = input(0);
  readonly total = input(0);
  readonly file = input('');
  readonly pct = computed(() => this.total() > 0 ? Math.round((this.current() / this.total()) * 100) : 0);
  readonly labelText = computed(() => `Progress: ${this.current()} of ${this.total()} files`);
}
