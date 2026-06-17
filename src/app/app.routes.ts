import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'search', pathMatch: 'full' },
  {
    path: 'search',
    loadComponent: () => import('./pages/search/search.component').then(m => m.SearchComponent),
  },
  {
    path: 'collections',
    loadComponent: () => import('./pages/collections/collections.component').then(m => m.CollectionsComponent),
  },
  {
    path: 'index',
    loadComponent: () => import('./pages/index-embed/index-embed.component').then(m => m.IndexEmbedComponent),
  },
  {
    path: 'documents',
    loadComponent: () => import('./pages/documents/documents.component').then(m => m.DocumentsComponent),
  },
  {
    path: 'context',
    loadComponent: () => import('./pages/context/context.component').then(m => m.ContextComponent),
  },
  {
    path: 'bug-hunt',
    loadComponent: () =>
      import('./pages/bug-hunt/bug-hunt.component').then(
        (m) => m.BugHuntComponent,
      ),
  },
  {
    path: 'settings',
    loadComponent: () => import('./pages/settings/settings.component').then(m => m.SettingsComponent),
  },
];
