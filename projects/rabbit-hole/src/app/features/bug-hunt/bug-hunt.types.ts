export type BugHuntMode = 'practice' | 'timed';
export type BugHuntCategory =
  | 'frontend'
  | 'backend'
  | 'data'
  | 'testing'
  | 'performance'
  | 'accessibility';
export type BugHuntDifficulty = 'intro' | 'intermediate' | 'advanced';

export interface BugFixOption {
  id: string;
  label: string;
}

export interface BugHuntScenario {
  id: string;
  title: string;
  bugPattern: string;
  category: BugHuntCategory;
  difficulty: BugHuntDifficulty;
  prompt: string;
  codeSnippet?: string;
  correctFix: BugFixOption;
  distractorFixes: readonly BugFixOption[];
  explanation: string;
}

export interface BugHuntMatchResult {
  isCorrect: boolean;
  selectedFixId: string;
  correctFixId: string;
  explanation: string;
  category: BugHuntCategory;
}

export interface MissedCategoryStat {
  category: BugHuntCategory;
  misses: number;
}

export interface TimedRunSummary {
  score: number;
  bestStreak: number;
  totalMistakes: number;
  mostMissedCategories: readonly MissedCategoryStat[];
  noMisses: boolean;
  secondsUsed: number;
}
