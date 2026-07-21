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

      // Kanji
      { path: 'kanji', loadComponent: () => import('./features/kanji/pages/kanji-search/kanji-search.component').then((m) => m.KanjiSearchComponent) },

      // Grammar (Ngữ pháp)
      { path: 'grammar', loadComponent: () => import('./features/grammar/pages/grammar-search/grammar-search.component').then((m) => m.GrammarSearchComponent) },

      // Exams (Đề kiểm tra) — hoàn toàn tách biệt với Quiz và SRS
      { path: 'exams', loadComponent: () => import('./features/exams/pages/exam-list/exam-list.component').then((m) => m.ExamListComponent) },
      { path: 'exams/mine', loadComponent: () => import('./features/exams/pages/my-exams/my-exams.component').then((m) => m.MyExamsComponent) },
      { path: 'exams/create', loadComponent: () => import('./features/exams/pages/exam-create/exam-create.component').then((m) => m.ExamCreateComponent) },
      { path: 'exams/:id', loadComponent: () => import('./features/exams/pages/exam-play/exam-play.component').then((m) => m.ExamPlayComponent) },
      { path: 'exams/:id/result/:attemptId', loadComponent: () => import('./features/exams/pages/exam-result/exam-result.component').then((m) => m.ExamResultComponent) },

      // Folders
      { path: 'folders', loadComponent: () => import('./features/folders/pages/folder-list/folder-list.component').then((m) => m.FolderListComponent) },
      { path: 'folders/:id', loadComponent: () => import('./features/folders/pages/folder-detail/folder-detail.component').then((m) => m.FolderDetailComponent) },

      // Quizzes
      { path: 'quizzes', loadComponent: () => import('./features/quizzes/pages/quiz-list/quiz-list.component').then((m) => m.QuizListComponent) },
      { path: 'my-quizzes', loadComponent: () => import('./features/quizzes/pages/my-quizzes/my-quizzes.component').then((m) => m.MyQuizzesComponent) },
      { path: 'quiz-create', loadComponent: () => import('./features/quizzes/pages/quiz-create/quiz-create.component').then((m) => m.QuizCreateComponent) },
      { path: 'quizzes/:id', loadComponent: () => import('./features/quizzes/pages/quiz-play/quiz-play.component').then((m) => m.QuizPlayComponent) },

      // SRS Review
      { path: 'srs', loadComponent: () => import('./features/srs/pages/srs-review/srs-review.component').then((m) => m.SrsReviewComponent) },

      // Posts
      { path: 'posts', loadComponent: () => import('./features/posts/pages/post-list/post-list.component').then((m) => m.PostListComponent) },
      { path: 'posts/:id', loadComponent: () => import('./features/posts/pages/post-detail/post-detail.component').then((m) => m.PostDetailComponent) },

      // Leaderboard
      { path: 'leaderboard', loadComponent: () => import('./features/leaderboard/pages/leaderboard/leaderboard.component').then((m) => m.LeaderboardComponent) },

      // Messages
      { path: 'messages', loadComponent: () => import('./features/messages/pages/messages/messages.component').then((m) => m.MessagesComponent) },

      // Profile
      { path: 'profile', loadComponent: () => import('./features/profile/pages/profile/profile.component').then((m) => m.ProfileComponent) },
    ]
  },

  { path: '**', redirectTo: 'home' }
];
