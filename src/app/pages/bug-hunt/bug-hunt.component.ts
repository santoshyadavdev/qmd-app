import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-bug-hunt',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`
    .page { display: flex; flex-direction: column; gap: 12px; }
    h1 { margin: 0; font-size: 18px; font-weight: 600; color: var(--qmd-text-primary); }
    p { margin: 0; font-size: 13px; color: var(--qmd-text-muted); }
  `],
  template: `
    <section class="page" aria-labelledby="bug-hunt-heading">
      <h1 id="bug-hunt-heading">Bug Hunt Lab</h1>
      <p>Match each bug to the safest fix.</p>
    </section>
  `,
})
export class BugHuntComponent {}
