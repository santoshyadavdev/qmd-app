import { Component, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-toast',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div role="status" aria-live="polite"></div>`,
})
export class ToastComponent {}
