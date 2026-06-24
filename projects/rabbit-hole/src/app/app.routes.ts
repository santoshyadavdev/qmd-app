import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/bug-hunt/bug-hunt.component').then(
        (m) => m.BugHuntComponent,
      ),
  },
];
