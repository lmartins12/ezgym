import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'workouts',
    loadComponent: () => import('@features').then((m) => m.WorkoutsListPage),
  },
  {
    path: 'workouts/:id',
    loadComponent: () => import('@features').then((m) => m.WorkoutDetailPage),
  },
  {
    path: '',
    redirectTo: 'workouts',
    pathMatch: 'full',
  },
];
