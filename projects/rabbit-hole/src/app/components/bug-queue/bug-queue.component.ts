import { Component, input, ChangeDetectionStrategy } from '@angular/core';
import type { BugHuntScenario } from '../../features/bug-hunt/bug-hunt.types';

@Component({
  selector: 'app-bug-queue',
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="bug-queue">
      <h2>Bug Queue</h2>
      <ul>
        @for (scenario of scenarios(); track scenario.id) {
          <li
            [class.active]="scenario.id === activeScenarioId()"
            [attr.aria-current]="scenario.id === activeScenarioId() ? 'step' : null">
            {{ scenario.title }}
          </li>
        }
      </ul>
    </section>
  `,
  styles: `
    .bug-queue {
      padding: 1rem;
    }

    .bug-queue h2 {
      margin-top: 0;
    }

    .bug-queue ul {
      list-style: none;
      padding: 0;
      margin: 0;
    }

    .bug-queue li {
      padding: 0.5rem;
      border: 1px solid #ccc;
      margin-bottom: 0.5rem;
      color: var(--qmd-text-primary);
    }

    .bug-queue li.active {
      background: #1e3a5f;
      border-color: #60a5fa;
      color: #e2e8f0;
    }
  `,
})
export class BugQueueComponent {
  readonly scenarios = input.required<readonly BugHuntScenario[]>();
  readonly activeScenarioId = input<string | null>(null);
}
