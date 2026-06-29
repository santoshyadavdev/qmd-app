import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ExplanationPanelComponent } from './explanation-panel.component';
import type { BugHuntMatchResult } from '../../features/bug-hunt/bug-hunt.types';
import type { CodeRabbitReview } from '../../features/bug-hunt/coderabbit-review.types';

const latestResultFixture: BugHuntMatchResult = {
  isCorrect: true,
  selectedFixId: 'replace-array',
  correctFixId: 'replace-array',
  explanation: 'Signals should update state with a new reference.',
  category: 'frontend',
};

const reviewFixture: CodeRabbitReview = {
  summary: 'CodeRabbit agrees with the selected fix.',
  comments: [
    {
      line: 12,
      severity: 'warning',
      message: 'Consider guarding the state transition before updating.',
    },
  ],
};

describe('ExplanationPanelComponent', () => {
  let fixture: ComponentFixture<ExplanationPanelComponent>;
  let component: ExplanationPanelComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExplanationPanelComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ExplanationPanelComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('mode', 'practice');
  });

  it('shows a CodeRabbit review button when a practice result has no review state', () => {
    fixture.componentRef.setInput('latestResult', latestResultFixture);
    fixture.detectChanges();

    const reviewButton = fixture.debugElement.query(By.css('.review-button'));

    expect(reviewButton).not.toBeNull();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Get CodeRabbit Review');
  });

  it('emits reviewRequested when the review button is clicked', () => {
    const reviewRequestedSpy = vi.fn();
    component.reviewRequested.subscribe(reviewRequestedSpy);

    fixture.componentRef.setInput('latestResult', latestResultFixture);
    fixture.detectChanges();

    const reviewButton = fixture.debugElement.query(By.css('.review-button')).nativeElement as HTMLButtonElement;
    reviewButton.click();

    expect(reviewRequestedSpy).toHaveBeenCalledTimes(1);
  });

  it('shows a loading status while CodeRabbit review is in progress', () => {
    fixture.componentRef.setInput('latestResult', latestResultFixture);
    fixture.componentRef.setInput('reviewLoading', true);
    fixture.detectChanges();

    const loadingPanel = fixture.debugElement.query(By.css('.review-loading'));

    expect(loadingPanel).not.toBeNull();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('CodeRabbit is reviewing this code…');
  });

  it('shows review results when CodeRabbit feedback is available', () => {
    fixture.componentRef.setInput('latestResult', latestResultFixture);
    fixture.componentRef.setInput('reviewResult', reviewFixture);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.textContent).toContain('CodeRabbit Review');
    expect(compiled.textContent).toContain(reviewFixture.summary);
    expect(compiled.textContent).toContain('Line 12:');
    expect(compiled.textContent).toContain(reviewFixture.comments[0].message);
  });

  it('shows a retry action when the CodeRabbit review fails', () => {
    const reviewRequestedSpy = vi.fn();
    component.reviewRequested.subscribe(reviewRequestedSpy);

    fixture.componentRef.setInput('latestResult', latestResultFixture);
    fixture.componentRef.setInput('reviewError', 'Review failed. Please try again.');
    fixture.detectChanges();

    const retryButton = fixture.debugElement.query(By.css('.review-error button'))
      .nativeElement as HTMLButtonElement;

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Review failed. Please try again.');

    retryButton.click();

    expect(reviewRequestedSpy).toHaveBeenCalledTimes(1);
  });
});
