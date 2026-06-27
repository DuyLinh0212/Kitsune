import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { AuthService } from '../../../../core/services/auth.service';
import { FolderService, FolderDto } from '../../../../core/services/folder.service';
import { UserProfile } from '../../../../core/models/auth.model';

interface ContinueLearningItem {
  name: string;
  progress: number;
  total: number;
  type: 'vocabulary' | 'kanji';
}

interface QuizPracticeItem {
  name: string;
  progress: number;
  timeLeft: string;
  totalQuestions: number;
}

interface SRSReviewItem {
  word: string;
  reading: string;
  type: 'vocabulary' | 'kanji';
  level: number;
}

interface AchievementItem {
  icon: string;
  name: string;
}

interface PostItem {
  userName: string;
  content: string;
}

interface LeaderboardEntry {
  userName: string;
  totalScore: number;
}

interface ConversationItem {
  userName: string;
  unreadCount: number;
  lastMessage: string;
}

@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent {
  private readonly authService = inject(AuthService);
  private readonly folderService = inject(FolderService);
  protected readonly router = inject(Router);

  readonly currentUser = signal<UserProfile | null>(this.authService.getStoredUser());

  // User stats
  readonly streak = signal(12);
  readonly totalXP = signal(1280);
  readonly dailyGoal = signal({ current: 8, target: 20 });
  readonly level = signal(22);

  // Dashboard data
  readonly continueLearning = signal<ContinueLearningItem[]>([]);
  readonly quizPractice = signal<QuizPracticeItem[]>([]);
  readonly srsReviewItems = signal<SRSReviewItem[]>([]);
  readonly achievements = signal<AchievementItem[]>([]);

  // Search
  readonly searchQuery = signal('');
  readonly searchResults = signal<any[]>([]);
  readonly isSearching = signal(false);

  // Other dashboard data
  readonly recentPosts = signal<PostItem[]>([]);
  readonly leaderboard = signal<LeaderboardEntry[]>([]);
  readonly conversations = signal<ConversationItem[]>([]);

  // Forms
  readonly quizForm = {
    title: '',
    description: '',
    timeLimit: 30,
    isPublic: true,
    modeId: 0 as number,
    sourceFolderId: 0 as number
  };

  readonly newPost = { title: '', content: '' };

  constructor() {
    this.loadContinueLearning();
    this.loadQuizPractice();
    this.loadSRSReview();
    this.loadAchievements();
    this.loadRecentPosts();
    this.loadLeaderboard();
    this.loadConversations();
  }

  private loadContinueLearning(): void {
    this.continueLearning.set([
      { name: 'N5 Vocabulary', progress: 45, total: 100, type: 'vocabulary' },
      { name: 'Kanji N5', progress: 32, total: 100, type: 'kanji' }
    ]);
  }

  private loadQuizPractice(): void {
    this.quizPractice.set([
      { name: 'JLPT N5 Vocabulary Quiz', progress: 60, timeLeft: '5 min', totalQuestions: 10 },
      { name: 'Kanji N5', progress: 32, timeLeft: '2 days ago', totalQuestions: 20 },
      { name: 'Kanji Basic Test', progress: 73, timeLeft: '1 week ago', totalQuestions: 15 },
      { name: 'Grammar Practice N5', progress: 90, timeLeft: '2 weeks ago', totalQuestions: 25 }
    ]);
  }

  private loadSRSReview(): void {
    this.srsReviewItems.set([
      { word: '学生', reading: 'がくせい (gakusei)', type: 'vocabulary', level: 1 },
      { word: '学生', reading: 'がくせい (gakusei)', type: 'vocabulary', level: 2 },
      { word: '学生', reading: 'がくせい (gakusei)', type: 'vocabulary', level: 3 },
      { word: '学生', reading: 'がくせい (gakusei)', type: 'vocabulary', level: 4 }
    ]);
  }

  private loadAchievements(): void {
    this.achievements.set([
      { icon: '🔥', name: '7 Day Streak' },
      { icon: '⭐', name: 'First Quiz' },
      { icon: '🏆', name: 'Top 10' },
      { icon: '🌟', name: '100 Cards' },
      { icon: '🎯', name: 'Perfect Score' }
    ]);
  }

  private loadRecentPosts(): void {
    this.recentPosts.set([
      { userName: 'Nguyễn Văn A', content: 'Just learned 20 new kanji today! 💪 Consistency is the key!' },
      { userName: 'Trần Thị B', content: 'N5 Grammar tips: は vs が explained simply!' }
    ]);
  }

  private loadLeaderboard(): void {
    this.leaderboard.set([
      { userName: 'Nguyễn Văn A', totalScore: 12450 },
      { userName: 'Trần Thị B', totalScore: 11200 },
      { userName: 'Lê Văn C', totalScore: 10800 },
      { userName: 'Phạm Thị D', totalScore: 9500 },
      { userName: 'Hoàng Văn E', totalScore: 8200 }
    ]);
  }

  private loadConversations(): void {
    this.conversations.set([
      { userName: 'Nguyễn Văn A', unreadCount: 2, lastMessage: "How's your study going?" },
      { userName: 'Trần Thị B', unreadCount: 0, lastMessage: 'See you tomorrow!' },
      { userName: 'Lê Văn C', unreadCount: 1, lastMessage: 'Thanks for the help!' }
    ]);
  }

  get displayName(): string {
    const u = this.currentUser();
    return u?.fullName || u?.username || 'Người dùng';
  }

  get initials(): string {
    const name = this.displayName;
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  get dailyGoalPercent(): number {
    const { current, target } = this.dailyGoal();
    return target > 0 ? Math.round((current / target) * 100) : 0;
  }

  trackById(index: number, _item: any): number {
    return index;
  }

  onSearch(): void {
    // Search is handled by VocabularySearchComponent
    this.router.navigate(['/vocabulary']);
  }

  goToVocab(_item: any): void {
    this.router.navigate(['/vocabulary']);
  }

  searchTitle(item: any): string {
    return item.word || item.Word || '';
  }

  searchSubtitle(item: any): string {
    return item.meaning || item.Meaning || '';
  }

  createQuiz(): void {
    this.router.navigate(['/quizzes/create']);
  }

  createPost(): void {
    this.router.navigate(['/posts']);
  }
}
