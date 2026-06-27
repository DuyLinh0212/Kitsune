import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../../core/services/auth.service';
import { UserProfile } from '../../../../core/models/auth.model';

type Tab = 'overview' | 'stats' | 'history' | 'achievements' | 'settings';

interface Achievement {
  icon: string;
  title: string;
  desc: string;
  date: string;
  colorClass: string;
}

interface Activity {
  icon: string;
  title: string;
  desc: string;
  time: string;
  colorClass: string;
}

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.css'
})
export class ProfileComponent implements OnInit {
  private readonly authService = inject(AuthService);

  readonly currentUser = signal<UserProfile | null>(this.authService.getStoredUser());
  readonly activeTab = signal<Tab>('overview');

  readonly streak = signal(12);
  readonly totalXP = signal(7650);
  readonly level = signal(22);
  readonly xpToNextLevel = signal(10000);
  readonly xpCurrent = signal(7650);
  readonly xpPercent = signal(77);

  readonly recentAchievements = signal<Achievement[]>([
    { icon: '🔥', title: '7 Day Streak', desc: 'Học liên tục 7 ngày', date: '12/05/2024', colorClass: 'bg-orange' },
    { icon: '⭐', title: 'First Quiz', desc: 'Hoàn thành quiz đầu tiên', date: '15/05/2024', colorClass: 'bg-yellow' },
    { icon: '🏆', title: 'Top 10', desc: 'Vào top 10 bảng xếp hạng', date: '20/05/2024', colorClass: 'bg-purple' },
    { icon: '🌟', title: '100 Cards', desc: 'Học được 100 thẻ từ vựng', date: '25/05/2024', colorClass: 'bg-blue' },
  ]);

  readonly recentActivities = signal<Activity[]>([
    { icon: '📝', title: 'Hoàn thành quiz: N5 Vocabulary Test', desc: 'Điểm: 85%', time: '2 giờ trước', colorClass: 'bg-green' },
    { icon: '🗂️', title: 'Ôn tập 45 thẻ trong SRS', desc: 'Độ chính xác: 92%', time: '5 giờ trước', colorClass: 'bg-blue' },
    { icon: '📖', title: 'Học 20 từ vựng mới', desc: 'Chủ đề: Gia đình', time: '1 ngày trước', colorClass: 'bg-purple' },
    { icon: '字', title: 'Học 5 kanji mới', desc: 'JLPT N5', time: '1 ngày trước', colorClass: 'bg-orange' },
  ]);

  readonly learningStats = signal({
    vocabularyLearned: 1248,
    kanjiLearned: 286,
    cardsReviewedToday: 452,
    accuracyRate: 89,
  });

  readonly folderStats = signal({
    totalFolders: 8,
    totalItems: 567,
  });

  readonly quizStats = signal({
    completed: 128,
    created: 12,
    avgScore: 82,
  });

  readonly srsStats = signal({
    totalCards: 1248,
    masteredCards: 456,
    learningCards: 234,
    newCards: 12,
  });

  ngOnInit(): void {
    const user = this.authService.getStoredUser();
    if (user) {
      this.currentUser.set(user);
    }
  }

  setTab(tab: Tab): void {
    this.activeTab.set(tab);
  }

  get displayName(): string {
    const u = this.currentUser();
    return u?.fullName || u?.username || 'Người dùng';
  }

  get username(): string {
    return this.currentUser()?.username || 'user';
  }

  get initials(): string {
    const name = this.displayName;
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  readonly tabs = [
    { id: 'overview' as Tab, label: 'Tổng quan' },
    { id: 'stats' as Tab, label: 'Thống kê' },
    { id: 'history' as Tab, label: 'Lịch sử học tập' },
    { id: 'achievements' as Tab, label: 'Thành tích' },
    { id: 'settings' as Tab, label: 'Cài đặt' },
  ];

  readonly weekDays = [
    { label: 'T2', done: true },
    { label: 'T3', done: true },
    { label: 'T4', done: true },
    { label: 'T5', done: true },
    { label: 'T6', done: true },
    { label: 'T7', done: true },
    { label: 'CN', done: false },
  ];

  logout(): void {
    this.authService.logout().subscribe({
      complete: () => window.location.href = '/login',
    });
  }
}
