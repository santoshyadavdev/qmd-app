import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { QmdService } from '../../services/qmd.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-settings',
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`
    .page { display: flex; flex-direction: column; gap: 24px; max-width: 600px; }
    h1 { font-size: 18px; font-weight: 600; margin: 0; }
    section { display: flex; flex-direction: column; gap: 10px; }
    h2 { font-size: 11px; font-weight: 600; letter-spacing: 0.08em; color: var(--qmd-text-muted); margin: 0; text-transform: uppercase; }
    .card { background: var(--qmd-surface); border: 1px solid var(--qmd-border); border-radius: 8px; padding: 14px; display: flex; flex-direction: column; gap: 10px; }
    .row { display: flex; align-items: center; justify-content: space-between; }
    .label { color: var(--qmd-text-secondary); font-size: 13px; }
    .value { color: var(--qmd-text-primary); font-size: 13px; font-family: monospace; }
    .badge-ok { color: var(--qmd-success); font-size: 11px; }
    .db-row { display: flex; gap: 8px; align-items: center; }
    input { flex: 1; background: rgba(255,255,255,0.05); border: 1px solid var(--qmd-border); border-radius: 6px; padding: 7px 10px; color: var(--qmd-text-primary); font-size: 13px; outline: none; font-family: monospace; }
    input:focus { border-color: var(--qmd-purple); }
    .btn { border-radius: 6px; padding: 7px 14px; font-size: 13px; cursor: pointer; border: none; }
    .btn-primary { background: var(--qmd-gradient); color: #fff; }
    .btn-danger { background: rgba(248,113,113,0.12); border: 1px solid rgba(248,113,113,0.3); color: var(--qmd-error); }
    .loading { color: var(--qmd-text-muted); font-size: 13px; }
    hr { border: none; border-top: 1px solid var(--qmd-border); margin: 0; }
  `],
  template: `
    <div class="page" aria-labelledby="settings-heading">
      <h1 id="settings-heading">Settings</h1>

      @if (qmd.status()) {
        <section aria-labelledby="db-section">
          <h2 id="db-section">Database</h2>
          <div class="card">
            <div class="db-row">
              <input [(ngModel)]="dbPathInput" [ngModelOptions]="{standalone: true}" aria-label="Database file path" placeholder="~/.qmd/index.sqlite" />
              <button class="btn btn-primary" (click)="saveDbPath()">Save</button>
            </div>
          </div>
        </section>

        <section aria-labelledby="status-section">
          <h2 id="status-section">Index Status</h2>
          <div class="card">
            <div class="row"><span class="label">Total documents</span><span class="value">{{ qmd.status()!.totalDocs }}</span></div>
            <hr />
            <div class="row"><span class="label">Embedded</span><span class="value">{{ qmd.status()!.embeddedDocs }}</span></div>
            <hr />
            <div class="row"><span class="label">Collections</span><span class="value">{{ qmd.status()!.collections.length }}</span></div>
            <hr />
            <div class="row"><span class="label">Model status</span><span class="badge-ok" role="status">● loaded</span></div>
          </div>
        </section>

        <section aria-labelledby="danger-section">
          <h2 id="danger-section">Danger Zone</h2>
          <div class="card">
            <div class="row">
              <div>
                <div class="label">Clear index</div>
                <div style="color:var(--qmd-text-muted);font-size:11px;margin-top:2px">Removes all indexed data. Your files are not deleted.</div>
              </div>
              <button class="btn btn-danger" (click)="clearIndex()" aria-label="Clear all indexed data">Clear Index</button>
            </div>
          </div>
        </section>
      } @else {
        <p class="loading" role="status">Loading status…</p>
      }
    </div>
  `,
})
export class SettingsComponent implements OnInit {
  protected readonly qmd = inject(QmdService);
  private readonly toast = inject(ToastService);

  readonly dbPathInput = signal('');

  ngOnInit(): void {
    this.qmd.loadStatus().then(() => this.dbPathInput.set(this.qmd.status()?.dbPath ?? ''));
  }

  async saveDbPath(): Promise<void> {
    try {
      await this.qmd.updateDbPath(this.dbPathInput());
      this.toast.success('Database path updated');
    } catch { this.toast.error('Failed to update database path'); }
  }

  clearIndex(): void {
    if (!confirm('This will clear all indexed data. Your files are not affected. Continue?')) return;
    this.toast.info('Clear index not yet implemented');
  }
}
