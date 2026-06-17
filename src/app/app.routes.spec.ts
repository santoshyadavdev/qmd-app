import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from './app.routes';
import { SidebarComponent } from './components/sidebar/sidebar.component';

describe('Bug Hunt route integration', () => {
  it('renders Bug Hunt Lab at /bug-hunt', async () => {
    TestBed.configureTestingModule({
      providers: [provideRouter(routes)],
    });

    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/bug-hunt');

    expect(
      harness.routeNativeElement?.querySelector('h1')?.textContent,
    ).toContain('Bug Hunt Lab');
  });

  it('shows the Bug Hunt Lab sidebar entry', async () => {
    await TestBed.configureTestingModule({
      imports: [SidebarComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    const fixture = TestBed.createComponent(SidebarComponent);
    fixture.detectChanges();

    const links = Array.from<HTMLAnchorElement>(
      fixture.nativeElement.querySelectorAll('a'),
    ).map((link) => link.textContent?.replace(/\s+/g, ' ').trim());

    expect(links).toContain('🐞 Bug Hunt Lab');
  });
});
