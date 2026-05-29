import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { QmdService } from '../../services/qmd.service';
import { ToastService } from '../../services/toast.service';
import { DocViewerComponent } from '../../components/doc-viewer/doc-viewer.component';

interface DocEntry {
  title: string;
  displayPath: string;
  collection: string;
  docId: string;
}

@Component({
  selector: 'app-documents',
  imports: [FormsModule, DocViewerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`
    .page { display: flex; flex-direction: column; height: 100%; gap: 16px; }
    h1 { font-size: 18px; font-weight: 600; margin: 0; }
    .toolbar { display: flex; gap: 8px; }
    select { background: rgba(255,255,255,0.05); border: 1px solid var(--qmd-border); border-radius: 6px; padding: 7px 10px; color: var(--qmd-text-secondary); font-size: 12px; cursor: pointer; }
    .content { display: flex; gap: 16px; flex: 1; min-height: 0; }
    .list { flex: 1; display: flex; flex-direction: column; gap: 4px; overflow-y: auto; }
    .item { background: var(--qmd-surface); border: 1px solid var(--qmd-border); border-radius: 6px; padding: 10px 12px; cursor: pointer; transition: border-color 0.15s; }
    .item:hover, .item:focus { border-color: var(--qmd-border-active); outline: none; }
    .item.selected { border-color: var(--qmd-purple); background: rgba(167,139,250,0.08); }
    .item-title { color: var(--qmd-text-primary); font-size: 13px; font-weight: 500; margin-bottom: 2px; }
    .item-path { color: var(--qmd-text-muted); font-family: monospace; font-size: 11px; }
    .preview { width: 400px; flex-shrink: 0; }
    .loading { color: var(--qmd-text-muted); text-align: center; padding: 48px 0; }
    .empty { color: var(--qmd-text-muted); text-align: center; padding: 48px 0; font-size: 13px; }
  `],
  template: `
    <section class="page" aria-labelledby="docs-heading">
      <h1 id="docs-heading">Documents</h1>
      <div class="toolbar">
        <select [(ngModel)]="filterCollection" aria-label="Filter by collection">
          <option value="">All collections</option>
          @for (c of qmd.collections(); track c.name) {
            <option [value]="c.name">{{ c.name }}</option>
          }
        </select>
      </div>
      <div class="content">
        <div class="list" role="list" aria-label="Documents">
          @if (loading()) {
            <p class="loading" role="status">Loading documents…</p>
          } @else if (filteredDocs().length === 0) {
            <p class="empty">No documents found. Index your collections first.</p>
          } @else {
            @for (doc of filteredDocs(); track doc.docId) {
              <div
                class="item"
                role="listitem"
                tabindex="0"
                [class.selected]="selectedPath() === doc.displayPath"
                (click)="selectDoc(doc)"
                (keydown.enter)="selectDoc(doc)"
                [attr.aria-label]="'Open ' + doc.title"
              >
                <div class="item-title">{{ doc.title }}</div>
                <div class="item-path">{{ doc.displayPath }}</div>
              </div>
            }
          }
        </div>
        <div class="preview">
          <app-doc-viewer [path]="selectedPath()" [content]="selectedContent()" (close)="selectedPath.set('')" />
        </div>
      </div>
    </section>
  `,
})
export class DocumentsComponent implements OnInit {
  protected readonly qmd = inject(QmdService);
  private readonly toast = inject(ToastService);

  readonly docs = signal<DocEntry[]>([]);
  readonly loading = signal(false);
  readonly filterCollection = signal('');
  readonly selectedPath = signal('');
  readonly selectedContent = signal('');

  readonly filteredDocs = computed(() => {
    const filter = this.filterCollection();
    return filter ? this.docs().filter(d => d.collection === filter) : this.docs();
  });

  ngOnInit(): void {
    this.qmd.loadCollections();
    this.loadDocs();
  }

  private async loadDocs(): Promise<void> {
    this.loading.set(true);
    try {
      const docs = await this.qmd.listDocuments();
      this.docs.set(docs);
    } catch {
      this.toast.error('Failed to load documents');
    } finally {
      this.loading.set(false);
    }
  }

  async selectDoc(doc: DocEntry): Promise<void> {
    this.selectedPath.set(doc.displayPath);
    try {
      const result = await this.qmd.getDocument(doc.displayPath) as any;
      this.selectedContent.set(result?.body ?? '');
    } catch {
      this.toast.error('Failed to load document content');
    }
  }
}
