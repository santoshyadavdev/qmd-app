import { Injectable, inject, signal, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import type {
  SearchResultItem,
  CollectionInfo,
  ContextEntry,
  AppStatus,
} from '../../api/types';

@Injectable({ providedIn: 'root' })
export class QmdService {
  private readonly http = inject(HttpClient);
  private readonly platformId = inject(PLATFORM_ID);

  readonly results = signal<SearchResultItem[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly collections = signal<CollectionInfo[]>([]);
  readonly contexts = signal<ContextEntry[]>([]);
  readonly status = signal<AppStatus | null>(null);

  private get isBrowser(): boolean {
    return isPlatformBrowser(this.platformId);
  }

  async search(q: string, mode: 'hybrid' | 'keyword' | 'semantic' = 'hybrid', collection?: string): Promise<void> {
    if (!this.isBrowser) return;
    this.loading.set(true);
    this.error.set(null);
    try {
      let params = new HttpParams().set('q', q).set('mode', mode);
      if (collection) params = params.set('collection', collection);
      const data = await firstValueFrom(this.http.get<SearchResultItem[]>('/api/search', { params }));
      this.results.set(data);
    } catch (err: any) {
      const msg = err?.error?.error ?? err?.message ?? String(err);
      this.error.set(msg);
      this.results.set([]);
    } finally {
      this.loading.set(false);
    }
  }

  async listDocuments(collection?: string): Promise<{ title: string; displayPath: string; collection: string; docId: string }[]> {
    let params = new HttpParams();
    if (collection) params = params.set('collection', collection);
    return firstValueFrom(this.http.get<any[]>('/api/documents', { params }));
  }

  async getDocument(path: string): Promise<unknown> {
    return firstValueFrom(this.http.get('/api/get', { params: { path } }));
  }

  async loadCollections(): Promise<void> {
    if (!this.isBrowser) return;
    const data = await firstValueFrom(this.http.get<CollectionInfo[]>('/api/collections'));
    this.collections.set(data);
  }

  async addCollection(name: string, path: string): Promise<void> {
    await firstValueFrom(this.http.post('/api/collections', { name, path }));
    await this.loadCollections();
  }

  async removeCollection(name: string): Promise<void> {
    await firstValueFrom(this.http.delete(`/api/collections/${encodeURIComponent(name)}`));
    await this.loadCollections();
  }

  async renameCollection(name: string, newName: string): Promise<void> {
    await firstValueFrom(this.http.patch(`/api/collections/${encodeURIComponent(name)}`, { newName }));
    await this.loadCollections();
  }

  streamUpdate(collection?: string): EventSource {
    const url = collection ? `/api/index/update?collection=${encodeURIComponent(collection)}` : '/api/index/update';
    return new EventSource(url);
  }

  streamEmbed(collection?: string): EventSource {
    const url = collection ? `/api/index/embed?collection=${encodeURIComponent(collection)}` : '/api/index/embed';
    return new EventSource(url);
  }

  async loadContexts(): Promise<void> {
    if (!this.isBrowser) return;
    const data = await firstValueFrom(this.http.get<ContextEntry[]>('/api/context'));
    this.contexts.set(data);
  }

  async addContext(collection: string, path: string, context: string): Promise<void> {
    await firstValueFrom(this.http.post('/api/context', { collection, path, context }));
    await this.loadContexts();
  }

  async removeContext(collection: string, path: string): Promise<void> {
    await firstValueFrom(this.http.delete('/api/context', { params: { collection, path } }));
    await this.loadContexts();
  }

  async setGlobalContext(context: string): Promise<void> {
    await firstValueFrom(this.http.put('/api/context/global', { context }));
    await this.loadContexts();
  }

  async loadStatus(): Promise<void> {
    if (!this.isBrowser) return;
    const data = await firstValueFrom(this.http.get<AppStatus>('/api/status'));
    this.status.set(data);
  }

  async updateDbPath(dbPath: string): Promise<void> {
    await firstValueFrom(this.http.put('/api/settings/db-path', { dbPath }));
    await this.loadStatus();
  }
}
