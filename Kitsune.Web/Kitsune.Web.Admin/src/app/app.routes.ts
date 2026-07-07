import { Routes } from '@angular/router';

import { adminAuthGuard, adminGuestGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'home' },
  { path: 'home', canActivate: [adminAuthGuard], loadComponent: () => import('./features/home/pages/home/home.component').then((m) => m.HomeComponent) },
  { path: 'kanji', canActivate: [adminAuthGuard], loadComponent: () => import('./features/home/pages/kanji/kanji.component').then((m) => m.KanjiManagementComponent) },
  { path: 'vocabulary', canActivate: [adminAuthGuard], loadComponent: () => import('./features/home/pages/vocabulary/vocabulary.component').then((m) => m.VocabularyComponent) },
  { path: 'users', canActivate: [adminAuthGuard], loadComponent: () => import('./features/admin/pages/users/user-management.component').then((m) => m.UserManagementComponent) },
  { path: 'quizzes', canActivate: [adminAuthGuard], loadComponent: () => import('./features/admin/pages/quizzes/quiz-management.component').then((m) => m.QuizManagementComponent) },
  { path: 'posts', canActivate: [adminAuthGuard], loadComponent: () => import('./features/admin/pages/posts/post-management.component').then((m) => m.PostManagementComponent) },
  { path: 'logs', canActivate: [adminAuthGuard], loadComponent: () => import('./features/admin/pages/logs/system-logs.component').then((m) => m.SystemLogsComponent) },
  { path: 'messages', canActivate: [adminAuthGuard], loadComponent: () => import('./features/admin/pages/messages/admin-messages.component').then((m) => m.AdminMessagesComponent) },
  { path: 'login', canActivate: [adminGuestGuard], loadComponent: () => import('./features/auth/pages/login/login.component').then((m) => m.LoginComponent) },
  { path: 'register', canActivate: [adminGuestGuard], loadComponent: () => import('./features/auth/pages/register/register.component').then((m) => m.RegisterComponent) },
  { path: 'forgot-password', canActivate: [adminGuestGuard], loadComponent: () => import('./features/auth/pages/forgot-password/forgot-password.component').then((m) => m.ForgotPasswordComponent) },
  { path: '**', redirectTo: 'home' }
];
