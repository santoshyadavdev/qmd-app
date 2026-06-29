import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { CodeRabbitReviewService } from './coderabbit-review.service';
import type { CodeRabbitReview } from '../features/bug-hunt/coderabbit-review.types';

describe('CodeRabbitReviewService', () => {
  let service: CodeRabbitReviewService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(CodeRabbitReviewService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('should send a POST request with scenario data', () => {
    const mockResponse: CodeRabbitReview = {
      comments: [{ line: 5, message: 'Mutation detected', severity: 'warning' }],
      summary: 'Found 1 issue.',
    };

    service
      .requestReview('stale-state', 'const x = 1;', 'component.ts')
      .subscribe((result) => {
        expect(result).toEqual(mockResponse);
      });

    const req = httpTesting.expectOne('/api/coderabbit-review');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      scenarioId: 'stale-state',
      code: 'const x = 1;',
      filename: 'component.ts',
    });

    req.flush(mockResponse);
  });

  it('should propagate HTTP errors', () => {
    service
      .requestReview('bad-id', 'code', 'file.ts')
      .subscribe({
        next: () => {
          throw new Error('Expected requestReview() to propagate the HTTP error');
        },
        error: (err) => {
          expect(err.status).toBe(401);
        },
        complete: () => {
          throw new Error('Expected requestReview() not to complete successfully');
        },
      });

    const req = httpTesting.expectOne('/api/coderabbit-review');
    req.flush({ error: 'CodeRabbit not configured' }, { status: 401, statusText: 'Unauthorized' });
  });
});
