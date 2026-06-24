export interface CodeRabbitReviewComment {
  line: number;
  message: string;
  severity: string;
}

export interface CodeRabbitReview {
  comments: CodeRabbitReviewComment[];
  summary: string;
}

export interface CodeRabbitReviewRequest {
  scenarioId: string;
  code: string;
  filename: string;
}

export type CodeRabbitReviewStatus = 'idle' | 'loading' | 'success' | 'error';
