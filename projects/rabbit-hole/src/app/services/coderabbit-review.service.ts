import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import type {
  CodeRabbitReview,
  CodeRabbitReviewRequest,
} from '../features/bug-hunt/coderabbit-review.types';

@Injectable({ providedIn: 'root' })
export class CodeRabbitReviewService {
  private readonly http = inject(HttpClient);

  requestReview(
    scenarioId: string,
    code: string,
    filename: string,
  ): Observable<CodeRabbitReview> {
    const body: CodeRabbitReviewRequest = { scenarioId, code, filename };
    return this.http.post<CodeRabbitReview>('/api/coderabbit-review', body);
  }
}
