import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-toast',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`
    .container { position: fixed; bottom: 24px; right: 24px; display: flex; flex-direction: column; gap: 8px; z-index: 1000; pointer-events: none; }
    .toast { pointer-events: all; display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 10px 14px; border-radius: 8px; font-size: 13px; min-width: 260px; max-width: 400px; border: 1px solid; animation: slide-in 0.2s ease; }
    .success { background: rgba(52,211,153,0.12); border-color: rgba(52,211,153,0.3); color: var(--qmd-success); }
    .error { background: rgba(248,113,113,0.12); border-color: rgba(248,113,113,0.3); color: var(--qmd-error); }
    .info { background: rgba(167,139,250,0.1); border-color: var(--qmd-border-active); color: var(--qmd-purple); }
    button { background: none; border: none; cursor: pointer; color: inherit; opacity: 0.6; font-size: 14px; padding: 0; }
    button:hover { opacity: 1; }
    @keyframes slide-in { from { transform: translateX(20px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
  `],
  template: `
    <div class="container" aria-live="polite" aria-label="Notifications">
      @for (toast of toastService.toasts(); track toast.id) {
        <div class="toast {{ toast.type }}" role="status">
          <span>{{ toast.message }}</span>
          <button (click)="toastService.dismiss(toast.id)" [attr.aria-label]="'Dismiss: ' + toast.message">✕</button>
        </div>
      }
    </div>
  `,
})
export class ToastComponent {
  readonly toastService = inject(ToastService);
}
