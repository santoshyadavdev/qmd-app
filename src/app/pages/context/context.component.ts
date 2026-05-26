import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { QmdService } from '../../services/qmd.service';
import { ToastService } from '../../services/toast.service';
import type { ContextEntry } from '../../api/types';

@Component({
  selector: 'app-context',
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`
    .page { display: flex; flex-direction: column; gap: 20px; }
    .header { display: flex; align-items: center; justify-content: space-between; }
    h1 { font-size: 18px; font-weight: 600; margin: 0; }
    p.desc { color: var(--qmd-text-muted); font-size: 12px; margin: 0; }
    .add-btn { background: var(--qmd-gradient); border: none; border-radius: 6px; padding: 7px 14px; color: #fff; font-size: 13px; cursor: pointer; }
    .card { background: var(--qmd-surface); border: 1px solid var(--qmd-border); border-radius: 8px; padding: 14px; display: flex; flex-direction: column; gap: 8px; }
    .card-header { display: flex; align-items: center; justify-content: space-between; }
    .badge { font-size: 11px; font-weight: 600; letter-spacing: 0.04em; color: var(--qmd-purple); }
    .path-badge { color: var(--qmd-blue); }
    .context-text { color: var(--qmd-text-secondary); font-size: 13px; line-height: 1.5; margin: 0; }
    .actions { display: flex; gap: 6px; }
    .icon-btn { background: none; border: none; cursor: pointer; color: var(--qmd-text-muted); font-size: 13px; padding: 3px 6px; border-radius: 4px; }
    .icon-btn:hover { background: var(--qmd-surface-hover); }
    .danger { color: var(--qmd-error); }
    .form { background: rgba(167,139,250,0.06); border: 1px solid var(--qmd-border-active); border-radius: 8px; padding: 16px; display: flex; flex-direction: column; gap: 10px; }
    .form h2 { margin: 0; font-size: 14px; }
    .field { display: flex; flex-direction: column; gap: 4px; }
    label { font-size: 12px; color: var(--qmd-text-secondary); }
    input, textarea { background: rgba(255,255,255,0.05); border: 1px solid var(--qmd-border); border-radius: 6px; padding: 7px 10px; color: var(--qmd-text-primary); font-size: 13px; outline: none; font-family: inherit; }
    input:focus, textarea:focus { border-color: var(--qmd-purple); }
    textarea { resize: vertical; min-height: 70px; }
    .form-actions { display: flex; gap: 8px; }
    .btn { border-radius: 6px; padding: 7px 14px; font-size: 13px; cursor: pointer; border: none; }
    .btn-primary { background: var(--qmd-gradient); color: #fff; }
    .btn-secondary { background: var(--qmd-surface); border: 1px solid var(--qmd-border); color: var(--qmd-text-secondary); }
    .global-form { display: flex; flex-direction: column; gap: 8px; }
    .empty { color: var(--qmd-text-muted); text-align: center; padding: 24px 0; font-size: 13px; }
  `],
  template: `
    <section class="page" aria-labelledby="context-heading">
      <div class="header">
        <div>
          <h1 id="context-heading">Context</h1>
          <p class="desc">Context metadata helps the LLM pick better search results</p>
        </div>
        <button class="add-btn" (click)="showForm.set(!showForm())" [attr.aria-expanded]="showForm()">+ Add Context</button>
      </div>

      @if (showForm()) {
        <form class="form" (ngSubmit)="add()" aria-label="Add context form">
          <h2>Add Context</h2>
          <div class="field">
            <label for="ctx-collection">Collection</label>
            <input id="ctx-collection" [(ngModel)]="formCollection" name="collection" placeholder="e.g. notes" required />
          </div>
          <div class="field">
            <label for="ctx-path">Path prefix</label>
            <input id="ctx-path" [(ngModel)]="formPath" name="path" placeholder="e.g. /api or /" required />
          </div>
          <div class="field">
            <label for="ctx-text">Context description</label>
            <textarea id="ctx-text" [(ngModel)]="formContext" name="context" placeholder="Describe what this path contains…" required></textarea>
          </div>
          <div class="form-actions">
            <button type="submit" class="btn btn-primary">Add</button>
            <button type="button" class="btn btn-secondary" (click)="showForm.set(false)">Cancel</button>
          </div>
        </form>
      }

      <div class="card" aria-label="Global context">
        <div class="card-header">
          <span class="badge">🌍 GLOBAL</span>
          <div class="actions">
            <button class="icon-btn" (click)="editingGlobal.set(!editingGlobal())" aria-label="Edit global context">✏️</button>
          </div>
        </div>
        @if (editingGlobal()) {
          <div class="global-form">
            <textarea [(ngModel)]="globalContextText" [ngModelOptions]="{standalone: true}" aria-label="Global context text" rows="3"></textarea>
            <div class="form-actions">
              <button class="btn btn-primary" (click)="saveGlobal()">Save</button>
              <button class="btn btn-secondary" (click)="editingGlobal.set(false)">Cancel</button>
            </div>
          </div>
        } @else {
          <p class="context-text">{{ globalContext() || 'No global context set' }}</p>
        }
      </div>

      @if (collectionContexts().length === 0) {
        <p class="empty">No collection contexts yet.</p>
      }
      @for (entry of collectionContexts(); track entry.collection + entry.path) {
        <div class="card">
          <div class="card-header">
            <span class="badge path-badge">📁 {{ entry.collection }} / {{ entry.path }}</span>
            <div class="actions">
              <button class="icon-btn danger" (click)="remove(entry)" [attr.aria-label]="'Remove context for ' + entry.collection">🗑️</button>
            </div>
          </div>
          <p class="context-text">{{ entry.context }}</p>
        </div>
      }
    </section>
  `,
})
export class ContextComponent implements OnInit {
  protected readonly qmd = inject(QmdService);
  private readonly toast = inject(ToastService);

  readonly showForm = signal(false);
  readonly editingGlobal = signal(false);
  readonly formCollection = signal('');
  readonly formPath = signal('/');
  readonly formContext = signal('');
  readonly globalContextText = signal('');

  readonly globalContext = () => this.qmd.contexts().find(c => c.collection === '' && c.path === '')?.context ?? '';
  readonly collectionContexts = () => this.qmd.contexts().filter(c => !(c.collection === '' && c.path === ''));

  ngOnInit(): void {
    this.qmd.loadContexts().then(() => this.globalContextText.set(this.globalContext()));
  }

  async add(): Promise<void> {
    try {
      await this.qmd.addContext(this.formCollection(), this.formPath(), this.formContext());
      this.toast.success('Context added');
      this.formCollection.set(''); this.formPath.set('/'); this.formContext.set(''); this.showForm.set(false);
    } catch { this.toast.error('Failed to add context'); }
  }

  async saveGlobal(): Promise<void> {
    try {
      await this.qmd.setGlobalContext(this.globalContextText());
      this.editingGlobal.set(false);
      this.toast.success('Global context updated');
    } catch { this.toast.error('Failed to update global context'); }
  }

  async remove(entry: ContextEntry): Promise<void> {
    try {
      await this.qmd.removeContext(entry.collection, entry.path);
      this.toast.success('Context removed');
    } catch { this.toast.error('Failed to remove context'); }
  }
}
