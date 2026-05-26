import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-doc-viewer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`
    .panel { background: rgba(255,255,255,0.02); border: 1px solid var(--qmd-border); border-radius: 8px; display: flex; flex-direction: column; height: 100%; }
    .header { display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; border-bottom: 1px solid var(--qmd-border); }
    .path { color: var(--qmd-text-muted); font-family: monospace; font-size: 11px; }
    .close { background: none; border: none; color: var(--qmd-text-muted); cursor: pointer; font-size: 16px; padding: 4px; border-radius: 4px; }
    .close:hover { color: var(--qmd-text-primary); background: var(--qmd-surface); }
    .body { flex: 1; overflow-y: auto; padding: 16px; }
    pre { color: var(--qmd-text-secondary); font-family: monospace; font-size: 12px; white-space: pre-wrap; line-height: 1.6; margin: 0; }
    .empty { display: flex; align-items: center; justify-content: center; height: 100%; color: var(--qmd-text-muted); font-size: 13px; }
  `],
  template: `
    <aside class="panel" aria-label="Document preview">
      <div class="header">
        <span class="path">{{ path() || 'No document selected' }}</span>
        @if (path()) {
          <button class="close" (click)="close.emit()" aria-label="Close document preview">✕</button>
        }
      </div>
      <div class="body">
        @if (content()) {
          <pre>{{ content() }}</pre>
        } @else {
          <div class="empty">Select a document to preview</div>
        }
      </div>
    </aside>
  `,
})
export class DocViewerComponent {
  readonly path = input('');
  readonly content = input('');
  readonly close = output<void>();
}
