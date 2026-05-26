import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';
import type { SearchResultItem } from '../../../api/types';

@Component({
  selector: 'app-result-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`
    .card { background: var(--qmd-surface); border: 1px solid var(--qmd-border); border-radius: 8px; padding: 14px; cursor: pointer; transition: border-color 0.15s; border-left: 3px solid transparent; }
    .card:hover, .card:focus { border-color: var(--qmd-border-active); border-left-color: var(--qmd-purple); outline: none; }
    .card-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; margin-bottom: 4px; }
    .title { color: var(--qmd-text-primary); font-size: 13px; font-weight: 500; }
    .meta { color: var(--qmd-text-muted); font-size: 11px; font-family: monospace; margin-bottom: 6px; }
    .collection { color: var(--qmd-purple); }
    .snippet { color: var(--qmd-text-muted); font-size: 12px; line-height: 1.5; }
    .score { background: rgba(167,139,250,0.12); border-radius: 4px; padding: 2px 8px; font-size: 11px; color: var(--qmd-purple); white-space: nowrap; flex-shrink: 0; }
  `],
  template: `
    <article class="card" role="button" tabindex="0"
      [attr.aria-label]="'Open ' + result().title"
      (click)="open.emit(result())"
      (keydown.enter)="open.emit(result())"
      (keydown.space)="open.emit(result())">
      <div class="card-header">
        <span class="title">{{ result().title }}</span>
        <span class="score">{{ result().score }}%</span>
      </div>
      <div class="meta">{{ result().displayPath }} · <span class="collection">{{ result().collection }}</span></div>
      <p class="snippet">{{ result().snippet }}</p>
    </article>
  `,
})
export class ResultCardComponent {
  readonly result = input.required<SearchResultItem>();
  readonly open = output<SearchResultItem>();
}
