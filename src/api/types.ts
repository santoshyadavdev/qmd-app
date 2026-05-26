export interface SearchResultItem {
  title: string;
  displayPath: string;
  collection: string;
  snippet: string;
  score: number;
  docId: string;
  context?: string;
}

export interface CollectionInfo {
  name: string;
  pwd: string;
  glob_pattern: string;
  doc_count: number;
  active_count: number;
  last_modified: number;
  includeByDefault: boolean;
}

export interface ContextEntry {
  collection: string;
  path: string;
  context: string;
}

export interface ProgressUpdate {
  collection: string;
  file: string;
  current: number;
  total: number;
}

export interface IndexResult {
  done: true;
  indexed: number;
  updated: number;
  unchanged: number;
  removed: number;
}

export interface EmbedResult {
  done: true;
  embedded: number;
}

export interface AppStatus {
  dbPath: string;
  totalDocs: number;
  embeddedDocs: number;
  collections: CollectionInfo[];
  modelLoaded: boolean;
}

export interface ApiError {
  error: string;
}
