import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { QmdService } from '../../services/qmd.service';
import { ToastService } from '../../services/toast.service';
import { ResultCardComponent } from '../../components/result-card/result-card.component';
import { DocViewerComponent } from '../../components/doc-viewer/doc-viewer.component';
import type { SearchResultItem } from '../../../api/types';

type SearchMode = 'hybrid' | 'keyword' | 'semantic';

@Component({
  selector: 'app-search',
  imports: [FormsModule, ResultCardComponent, DocViewerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`
    .page { display: flex; flex-direction: column; gap: 16px; height: 100%; }
    h1 { font-size: 18px; font-weight: 600; color: var(--qmd-text-primary); margin: 0; }
    .search-bar { display: flex; gap: 8px; }
    input[type="search"] { flex: 1; background: rgba(255,255,255,0.05); border: 1px solid rgba(167,139,250,0.3); border-radius: 8px; padding: 9px 14px; color: var(--qmd-text-primary); font-size: 13px; outline: none; }
    input[type="search"]::placeholder { color: var(--qmd-text-muted); }
    input[type="search"]:focus { border-color: var(--qmd-purple); }
    button.search-btn { background: var(--qmd-gradient); border: none; border-radius: 6px; padding: 9px 16px; color: #fff; font-size: 13px; cursor: pointer; font-weight: 500; }
    .mode-bar { display: flex; gap: 4px; align-items: center; }
    .mode-btn { background: none; border: 1px solid transparent; border-radius: 4px; padding: 4px 12px; font-size: 12px; color: var(--qmd-text-muted); cursor: pointer; }
    .mode-btn.active { background: rgba(167,139,250,0.15); border-color: var(--qmd-border-active); color: var(--qmd-purple); }
    select { margin-left: auto; background: rgba(255,255,255,0.05); border: 1px solid var(--qmd-border); border-radius: 4px; padding: 4px 8px; color: var(--qmd-text-secondary); font-size: 12px; cursor: pointer; }
    .content { display: flex; gap: 16px; flex: 1; min-height: 0; }
    .results { display: flex; flex-direction: column; gap: 8px; flex: 1; overflow-y: auto; }
    .empty { color: var(--qmd-text-muted); font-size: 13px; text-align: center; padding: 48px 0; }
    .loading { color: var(--qmd-text-muted); font-size: 13px; text-align: center; padding: 48px 0; }
    .preview { width: 360px; flex-shrink: 0; }
  `],
  template: `
    <section class="page" aria-labelledby="search-heading">
      <h1 id="search-heading">Search</h1>

      <div class="search-bar" role="search">
        <input
          type="search"
          [(ngModel)]="query"
          (keydown.enter)="runSearch()"
          placeholder="Search your knowledge base…"
          aria-label="Search query"
        />
        <button class="search-btn" (click)="runSearch()" [disabled]="qmd.loading()">Search</button>
      </div>

      <div class="mode-bar" role="group" aria-label="Search mode">
        @for (m of modes; track m.value) {
          <button
            class="mode-btn"
            [class.active]="mode() === m.value"
            (click)="mode.set(m.value)"
            [attr.aria-pressed]="mode() === m.value"
          >{{ m.label }}</button>
        }
        <select [(ngModel)]="selectedCollection" aria-label="Filter by collection">
          <option value="">All collections</option>
          @for (c of qmd.collections(); track c.name) {
            <option [value]="c.name">{{ c.name }}</option>
          }
        </select>
      </div>

      <div class="content">
        <div class="results" aria-live="polite" aria-label="Search results">
          @if (qmd.loading()) {
            <p class="loading" role="status">Searching…</p>
          } @else if (qmd.results().length === 0 && hasSearched()) {
            <p class="empty">No results found</p>
          } @else {
            @for (result of qmd.results(); track result.docId) {
              <app-result-card [result]="result" (open)="openDoc($event)" />
            }
          }
        </div>

        @if (selectedDoc()) {
          <div class="preview">
            <app-doc-viewer
              [path]="selectedDocPath()"
              [content]="selectedDocContent()"
              (close)="selectedDoc.set(null)"
            />
          </div>
        }
      </div>
    </section>
  `,
})
export class SearchComponent implements OnInit {
  protected readonly qmd = inject(QmdService);
  private readonly toast = inject(ToastService);

  readonly query = signal('');
  readonly mode = signal<SearchMode>('keyword');
  readonly hasSearched = signal(false);
  readonly selectedDoc = signal<Record<string, unknown> | null>(null);
  readonly selectedCollection = signal('');

  readonly selectedDocPath = computed(() => (this.selectedDoc() as any)?.displayPath ?? '');
  readonly selectedDocContent = computed(() => (this.selectedDoc() as any)?.body ?? '');

  readonly modes: { value: SearchMode; label: string }[] = [
    { value: 'hybrid', label: 'Hybrid ✦' },
    { value: 'keyword', label: 'Keyword' },
    { value: 'semantic', label: 'Semantic' },
  ];

  ngOnInit(): void {
    this.qmd.loadCollections();
  }

  async runSearch(): Promise<void> {
    const q = this.query().trim();
    if (!q) return;
    this.hasSearched.set(true);
    await this.qmd.search(q, this.mode(), this.selectedCollection() || undefined);
    if (this.qmd.error()) {
      const err = this.qmd.error();
      const msg = typeof err === 'string' ? err : (err as any)?.message ?? 'Unknown error';
      this.toast.error('Search failed: ' + msg);
    }
  }

  async openDoc(result: SearchResultItem): Promise<void> {
    try {
      const doc = await this.qmd.getDocument(result.displayPath);
      this.selectedDoc.set(doc as Record<string, unknown>);
    } catch {
      this.toast.error('Failed to load document');
    }
  }
}
