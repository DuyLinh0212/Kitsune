import { Routes } from '@angular/router';

import { authGuard, guestGuard } from './core/guards/auth.guard';
import { MainLayoutComponent } from './shared/layout/main-layout/main-layout.component';

export const routes: Routes = [
  // Auth pages (no layout)
  { path: 'login', canActivate: [guestGuard], loadComponent: () => import('./features/auth/pages/login/login.component').then((m) => m.LoginComponent) },
  { path: 'register', loadComponent: () => import('./features/auth/pages/register/register.component').then((m) => m.RegisterComponent) },
  { path: 'forgot-password', loadComponent: () => import('./features/auth/pages/forgot-password/forgot-password.component').then((m) => m.ForgotPasswordComponent) },

  // Authenticated pages wrapped in MainLayout
  {
    path: '',
    canActivate: [authGuard],
    component: MainLayoutComponent,
    children: [
      { path: '', redirectTo: 'home', pathMatch: 'full' },

      // Home / Dashboard
      { path: 'home', loadComponent: () => import('./features/home/pages/home/home.component').then((m) => m.HomeComponent) },

      // Vocabulary
      { path: 'vocabulary', loadComponent: () => import('./features/vocabulary/pages/vocabulary-search/vocabulary-search.component').then((m) => m.VocabularySearchComponent) },
      { path: 'vocabulary/:id', loadComponent: () => import('./features/vocabulary/pages/vocabulary-detail/vocabulary-detail.component').then((m) => m.VocabularyDetailComponent) },

      // Profile
      { path: 'profile', loadComponent: () => import('./features/profile/pages/profile/profile.component').then((m) => m.ProfileComponent) },
    ]
  },

  { path: '**', redirectTo: 'home' }
];
