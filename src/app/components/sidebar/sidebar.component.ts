import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

interface NavItem { path: string; label: string; icon: string; ariaLabel: string; }

@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`
    nav { display: flex; flex-direction: column; width: 180px; min-height: 100vh; background: var(--qmd-sidebar-bg); border-right: 1px solid var(--qmd-border); padding: 12px 8px; gap: 2px; }
    .logo { display: flex; align-items: center; gap: 8px; padding: 8px 10px; margin-bottom: 10px; }
    .logo-icon { width: 24px; height: 24px; background: var(--qmd-gradient); border-radius: 6px; flex-shrink: 0; }
    .logo-text { font-size: 15px; font-weight: 600; color: var(--qmd-text-primary); }
    a { display: flex; align-items: center; gap: 10px; padding: 7px 10px; border-radius: 6px; color: var(--qmd-text-muted); font-size: 13px; border: 1px solid transparent; transition: background 0.15s; }
    a:hover { background: var(--qmd-surface); color: var(--qmd-text-secondary); }
    a.active { background: rgba(167,139,250,0.12); border-color: var(--qmd-border-active); color: var(--qmd-purple); }
    .icon { font-size: 16px; width: 20px; text-align: center; }
    .spacer { flex: 1; }
  `],
  template: `
    <nav aria-label="Main navigation">
      <div class="logo" aria-hidden="true">
        <div class="logo-icon"></div>
        <span class="logo-text">qmd</span>
      </div>
      @for (item of navItems; track item.path) {
        <a [routerLink]="item.path" routerLinkActive="active" [attr.aria-label]="item.ariaLabel">
          <span class="icon" aria-hidden="true">{{ item.icon }}</span>
          {{ item.label }}
        </a>
      }
      <div class="spacer"></div>
      <a routerLink="/settings" routerLinkActive="active" aria-label="Open settings">
        <span class="icon" aria-hidden="true">⚙️</span>
        Settings
      </a>
    </nav>
  `,
})
export class SidebarComponent {
  readonly navItems: NavItem[] = [
    { path: '/search', label: 'Search', icon: '🔍', ariaLabel: 'Go to search' },
    { path: '/collections', label: 'Collections', icon: '📁', ariaLabel: 'Manage collections' },
    { path: '/index', label: 'Index & Embed', icon: '⚡', ariaLabel: 'Index and embed documents' },
    { path: '/documents', label: 'Documents', icon: '📄', ariaLabel: 'Browse documents' },
    { path: '/context', label: 'Context', icon: '🏷️', ariaLabel: 'Manage context' },
    { path: '/bug-hunt', label: 'Bug Hunt Lab', icon: '🐞', ariaLabel: 'Open Bug Hunt Lab' },
  ];
}
