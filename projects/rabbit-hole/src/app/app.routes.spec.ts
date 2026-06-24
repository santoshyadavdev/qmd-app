import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from './app.routes';

describe('RabbitHole route integration', () => {
  it('renders Bug Hunt Lab at /', async () => {
    TestBed.configureTestingModule({
      providers: [provideRouter(routes)],
    });

    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/');

    expect(
      harness.routeNativeElement?.querySelector('h1')?.textContent,
    ).toContain('Bug Hunt Lab');
  });
});
