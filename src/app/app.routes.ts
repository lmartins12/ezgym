import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'tabs',
    loadComponent: () =>
      import('@layouts/tabs/tabs.page').then((m) => m.TabsPage),
    children: [
      {
        path: 'workouts',
        title: 'EzGym — Treinos',
        loadComponent: () =>
          import('@features/workouts/pages/workouts-list.page').then(
            (m) => m.WorkoutsListPage,
          ),
      },
      {
        path: 'session',
        title: 'EzGym — Sessão',
        loadComponent: () =>
          import('@features/session/pages/session.page').then(
            (m) => m.SessionPage,
          ),
      },
      {
        path: 'dashboard',
        title: 'EzGym — Dashboard',
        loadComponent: () =>
          import('@features/dashboard/pages/dashboard.page').then(
            (m) => m.DashboardPage,
          ),
      },
      {
        path: 'progress',
        title: 'EzGym — Progresso',
        loadComponent: () =>
          import('@features/progress/pages/progress.page').then(
            (m) => m.ProgressPage,
          ),
      },
      {
        path: 'settings',
        title: 'EzGym — Ajustes',
        loadComponent: () =>
          import('@features/settings/pages/settings.page').then(
            (m) => m.SettingsPage,
          ),
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
    title: 'EzGym — Treino',
    loadComponent: () =>
      import('@features/workouts/pages/workout-detail.page').then(
        (m) => m.WorkoutDetailPage,
      ),
  },
  {
    path: 'session/:id',
    title: 'EzGym — Sessão',
    loadComponent: () =>
      import('@features/session/pages/session.page').then((m) => m.SessionPage),
  },
  {
    path: '',
    redirectTo: '/tabs/workouts',
    pathMatch: 'full',
  },
  {
    path: '**',
    redirectTo: '/tabs/workouts',
  },
];
