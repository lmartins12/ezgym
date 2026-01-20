import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'workouts',
    loadComponent: () => import('@features').then((m) => m.WorkoutsPage),
  },
  {
    path: '',
    redirectTo: 'workouts',
    pathMatch: 'full',
  },
];
