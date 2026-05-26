import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { QmdService } from '../../services/qmd.service';
import { ToastService } from '../../services/toast.service';
import type { CollectionInfo } from '../../api/types';

@Component({
  selector: 'app-collections',
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`
    .page { display: flex; flex-direction: column; gap: 20px; }
    .header { display: flex; align-items: center; justify-content: space-between; }
    h1 { font-size: 18px; font-weight: 600; margin: 0; }
    .add-btn { background: var(--qmd-gradient); border: none; border-radius: 6px; padding: 7px 14px; color: #fff; font-size: 13px; cursor: pointer; }
    .cards { display: flex; flex-direction: column; gap: 10px; }
    .card { background: var(--qmd-surface); border: 1px solid var(--qmd-border); border-radius: 8px; padding: 14px; display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
    .card-info { display: flex; flex-direction: column; gap: 4px; }
    .name { color: var(--qmd-purple); font-weight: 500; font-size: 13px; }
    .path { color: var(--qmd-text-muted); font-family: monospace; font-size: 11px; }
    .meta { color: var(--qmd-text-muted); font-size: 11px; }
    .stale { color: var(--qmd-warning); }
    .actions { display: flex; gap: 8px; flex-shrink: 0; }
    .icon-btn { background: none; border: none; cursor: pointer; color: var(--qmd-text-muted); font-size: 14px; padding: 4px; border-radius: 4px; }
    .icon-btn:hover { background: var(--qmd-surface-hover); color: var(--qmd-text-primary); }
    .danger { color: var(--qmd-error); }
    .form { background: rgba(167,139,250,0.06); border: 1px solid var(--qmd-border-active); border-radius: 8px; padding: 16px; display: flex; flex-direction: column; gap: 10px; }
    .form h2 { margin: 0; font-size: 14px; font-weight: 600; }
    .field { display: flex; flex-direction: column; gap: 4px; }
    label { font-size: 12px; color: var(--qmd-text-secondary); }
    input { background: rgba(255,255,255,0.05); border: 1px solid var(--qmd-border); border-radius: 6px; padding: 7px 10px; color: var(--qmd-text-primary); font-size: 13px; outline: none; }
    input:focus { border-color: var(--qmd-purple); }
    .form-actions { display: flex; gap: 8px; }
    .btn { border-radius: 6px; padding: 7px 14px; font-size: 13px; cursor: pointer; border: none; }
    .btn-primary { background: var(--qmd-gradient); color: #fff; }
    .btn-secondary { background: var(--qmd-surface); border: 1px solid var(--qmd-border); color: var(--qmd-text-secondary); }
    .empty { color: var(--qmd-text-muted); text-align: center; padding: 48px 0; font-size: 13px; }
  `],
  template: `
    <section class="page" aria-labelledby="collections-heading">
      <div class="header">
        <h1 id="collections-heading">Collections</h1>
        <button class="add-btn" (click)="showForm.set(!showForm())" [attr.aria-expanded]="showForm()">
          + Add Collection
        </button>
      </div>

      @if (showForm()) {
        <form class="form" (ngSubmit)="addCollection()" aria-label="Add collection form">
          <h2>Add Collection</h2>
          <div class="field">
            <label for="col-name">Name</label>
            <input id="col-name" [(ngModel)]="newName" name="name" placeholder="e.g. notes" required />
          </div>
          <div class="field">
            <label for="col-path">Path</label>
            <input id="col-path" [(ngModel)]="newPath" name="path" placeholder="e.g. ~/notes" required />
          </div>
          <div class="form-actions">
            <button type="submit" class="btn btn-primary" [disabled]="!newName() || !newPath()">Add</button>
            <button type="button" class="btn btn-secondary" (click)="showForm.set(false)">Cancel</button>
          </div>
        </form>
      }

      <div class="cards" aria-label="Collections list">
        @if (qmd.collections().length === 0) {
          <p class="empty">No collections yet. Add one to get started.</p>
        }
        @for (col of qmd.collections(); track col.name) {
          <div class="card">
            <div class="card-info">
              <span class="name">📁 {{ col.name }}</span>
              <span class="path">{{ col.pwd }}</span>
              <span class="meta">
                {{ col.doc_count }} docs
                @if (col.doc_count > col.active_count) {
                  · <span class="stale" role="status">⚠ needs re-index</span>
                }
              </span>
            </div>
            <div class="actions" [attr.aria-label]="'Actions for ' + col.name">
              <button class="icon-btn danger" (click)="remove(col)" [attr.aria-label]="'Remove ' + col.name">🗑️</button>
            </div>
          </div>
        }
      </div>
    </section>
  `,
})
export class CollectionsComponent implements OnInit {
  protected readonly qmd = inject(QmdService);
  private readonly toast = inject(ToastService);

  readonly showForm = signal(false);
  readonly newName = signal('');
  readonly newPath = signal('');

  ngOnInit(): void {
    this.qmd.loadCollections().catch(() => this.toast.error('Failed to load collections'));
  }

  async addCollection(): Promise<void> {
    if (!this.newName() || !this.newPath()) return;
    try {
      await this.qmd.addCollection(this.newName(), this.newPath());
      this.toast.success(`Collection "${this.newName()}" added`);
      this.newName.set('');
      this.newPath.set('');
      this.showForm.set(false);
    } catch {
      this.toast.error('Failed to add collection');
    }
  }

  async remove(col: CollectionInfo): Promise<void> {
    if (!confirm(`Remove collection "${col.name}"? This does not delete your files.`)) return;
    try {
      await this.qmd.removeCollection(col.name);
      this.toast.success(`Collection "${col.name}" removed`);
    } catch {
      this.toast.error('Failed to remove collection');
    }
  }
}
