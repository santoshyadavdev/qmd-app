import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { SidebarComponent } from './components/sidebar/sidebar.component';

describe('QMD navigation boundaries', () => {
  it('does not register the bug hunt route', () => {
    expect(routes.some((route) => route.path === 'bug-hunt')).toBe(false);
  });

  it('does not show a Bug Hunt Lab sidebar entry', async () => {
    await TestBed.configureTestingModule({
      imports: [SidebarComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    const fixture = TestBed.createComponent(SidebarComponent);
    fixture.detectChanges();

    const links = Array.from<HTMLAnchorElement>(
      fixture.nativeElement.querySelectorAll('a'),
    ).map((link) => link.textContent?.replace(/\s+/g, ' ').trim());

    expect(links).not.toContain('🐞 Bug Hunt Lab');
  });
});
