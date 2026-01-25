import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'tabs',
    loadComponent: () => import('@features').then((m) => m.TabsPage),
    children: [
      {
        path: 'workouts',
        loadComponent: () =>
          import('@features').then((m) => m.WorkoutsListPage),
      },
      {
        path: 'session',
        loadComponent: () => import('@features').then((m) => m.SessionPage),
      },
      {
        path: 'dashboard',
        loadComponent: () => import('@features').then((m) => m.DashboardPage),
      },
      {
        path: 'settings',
        loadComponent: () => import('@features').then((m) => m.SettingsPage),
      },
      {
        path: '',
        redirectTo: '/tabs/workouts',
        pathMatch: 'full',
      },
    ],
  },
  {
    path: 'workouts/:id',
    loadComponent: () => import('@features').then((m) => m.WorkoutDetailPage),
  },
  {
    path: '',
    redirectTo: '/tabs/workouts',
    pathMatch: 'full',
  },
];
