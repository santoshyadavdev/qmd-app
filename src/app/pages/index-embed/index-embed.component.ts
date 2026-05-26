import { Component, inject, signal, OnInit, ChangeDetectionStrategy, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { QmdService } from '../../services/qmd.service';
import { ToastService } from '../../services/toast.service';
import { ProgressBarComponent } from '../../components/progress-bar/progress-bar.component';
import type { ProgressUpdate } from '../../api/types';

type Operation = 'idle' | 'indexing' | 'embedding';

@Component({
  selector: 'app-index-embed',
  imports: [FormsModule, ProgressBarComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`
    .page { display: flex; flex-direction: column; gap: 20px; }
    h1 { font-size: 18px; font-weight: 600; margin: 0; }
    .controls { background: var(--qmd-surface); border: 1px solid var(--qmd-border); border-radius: 10px; padding: 16px; display: flex; flex-direction: column; gap: 14px; }
    .actions { display: flex; gap: 10px; }
    .action-card { flex: 1; background: rgba(255,255,255,0.03); border: 1px solid var(--qmd-border); border-radius: 8px; padding: 14px; display: flex; flex-direction: column; align-items: center; gap: 6px; cursor: pointer; transition: border-color 0.15s; }
    .action-card:hover:not(:disabled) { border-color: var(--qmd-border-active); }
    .action-card:disabled { opacity: 0.5; cursor: default; }
    .icon { font-size: 22px; }
    .action-card span:not(.icon) { font-size: 13px; font-weight: 500; }
    .action-card small { color: var(--qmd-text-muted); font-size: 11px; }
    select { background: rgba(255,255,255,0.05); border: 1px solid var(--qmd-border); border-radius: 6px; padding: 7px 10px; color: var(--qmd-text-secondary); font-size: 12px; cursor: pointer; align-self: flex-start; }
    .status-banner { background: rgba(167,139,250,0.1); border: 1px solid var(--qmd-border-active); border-radius: 8px; padding: 10px 14px; display: flex; align-items: center; gap: 10px; }
    .pulse { width: 8px; height: 8px; background: var(--qmd-purple); border-radius: 50%; animation: pulse 1.2s ease-in-out infinite; }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
    .log { background: #0d0b14; border: 1px solid var(--qmd-border); border-radius: 8px; padding: 12px; font-family: monospace; font-size: 11px; color: var(--qmd-text-muted); line-height: 1.8; max-height: 200px; overflow-y: auto; }
    .log-line.done { color: var(--qmd-success); }
    .log-line.error { color: var(--qmd-error); }
  `],
  template: `
    <section class="page" aria-labelledby="index-heading">
      <h1 id="index-heading">Index & Embed</h1>

      <div class="controls">
        <select [(ngModel)]="selectedCollection" aria-label="Target collection">
          <option value="">All collections</option>
          @for (c of qmd.collections(); track c.name) {
            <option [value]="c.name">{{ c.name }}</option>
          }
        </select>

        <div class="actions" role="group" aria-label="Index operations">
          <button class="action-card" (click)="startUpdate()" [disabled]="operation() !== 'idle'" aria-label="Re-index: scan filesystem for changes">
            <span class="icon" aria-hidden="true">🔄</span>
            <span>Re-index</span>
            <small>Scan filesystem</small>
          </button>
          <button class="action-card" (click)="startEmbed()" [disabled]="operation() !== 'idle'" aria-label="Embed: generate vector embeddings">
            <span class="icon" aria-hidden="true">🧠</span>
            <span>Embed</span>
            <small>Generate vectors</small>
          </button>
        </div>

        @if (operation() !== 'idle') {
          <div class="status-banner" role="status" aria-live="polite">
            <div class="pulse" aria-hidden="true"></div>
            <span>{{ operation() === 'indexing' ? 'Indexing' : 'Embedding' }} in progress…</span>
          </div>
          <app-progress-bar [current]="progress().current" [total]="progress().total" [file]="progress().file" />
        }
      </div>

      @if (logLines().length > 0) {
        <div class="log" aria-label="Operation log" aria-live="polite">
          @for (line of logLines(); track $index) {
            <div class="log-line" [class.done]="line.startsWith('✓')" [class.error]="line.startsWith('✗')">{{ line }}</div>
          }
        </div>
      }
    </section>
  `,
})
export class IndexEmbedComponent implements OnInit, OnDestroy {
  protected readonly qmd = inject(QmdService);
  private readonly toast = inject(ToastService);

  readonly operation = signal<Operation>('idle');
  readonly progress = signal<ProgressUpdate>({ collection: '', file: '', current: 0, total: 0 });
  readonly logLines = signal<string[]>([]);
  readonly selectedCollection = signal('');

  private es: EventSource | null = null;

  ngOnInit(): void {
    this.qmd.loadCollections();
  }

  ngOnDestroy(): void {
    this.es?.close();
  }

  startUpdate(): void {
    this.operation.set('indexing');
    this.logLines.set([]);
    this.es?.close();
    this.es = this.qmd.streamUpdate(this.selectedCollection() || undefined);

    this.es.onmessage = (e) => {
      const data = JSON.parse(e.data) as ProgressUpdate & { done?: true; error?: string; indexed?: number };
      if (data.error) { this.toast.error('Index failed: ' + data.error); this.operation.set('idle'); this.es?.close(); return; }
      if (data.done) { this.toast.success(`Indexed ${data.indexed ?? 0} files`); this.logLines.update(l => [...l, `✓ Done — ${data.indexed ?? 0} indexed`]); this.operation.set('idle'); this.es?.close(); return; }
      this.progress.set(data);
      this.logLines.update(l => [...l.slice(-50), `[${data.collection}] ${data.current}/${data.total} ${data.file}`]);
    };
    this.es.onerror = () => { this.toast.error('Index stream error'); this.operation.set('idle'); };
  }

  startEmbed(): void {
    this.operation.set('embedding');
    this.logLines.set([]);
    this.es?.close();
    this.es = this.qmd.streamEmbed(this.selectedCollection() || undefined);

    this.es.onmessage = (e) => {
      const data = JSON.parse(e.data) as ProgressUpdate & { done?: true; error?: string; embedded?: number };
      if (data.error) { this.toast.error('Embed failed: ' + data.error); this.operation.set('idle'); this.es?.close(); return; }
      if (data.done) { this.toast.success(`Embedded ${data.embedded ?? 0} files`); this.logLines.update(l => [...l, `✓ Done — ${data.embedded ?? 0} embedded`]); this.operation.set('idle'); this.es?.close(); return; }
      this.progress.set(data);
      this.logLines.update(l => [...l.slice(-50), `[${data.collection}] ${data.current}/${data.total} ${data.file}`]);
    };
    this.es.onerror = () => { this.toast.error('Embed stream error'); this.operation.set('idle'); };
  }
}
