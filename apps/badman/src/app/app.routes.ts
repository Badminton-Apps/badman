import { Routes } from '@angular/router';
import { AuthGuard } from '@badman/frontend-modules-auth';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('@badman/frontend-welcome').then((m) => m.WelcomePageComponent),
  },
  {
    path: 'public',
    loadChildren: () =>
      import('@badman/frontend-public').then((m) => m.routes),
  },

  {
    path: 'private',
    canActivate: [AuthGuard],
    loadChildren: () =>
      import('@badman/frontend-private').then((m) => m.routes),
  },
];
