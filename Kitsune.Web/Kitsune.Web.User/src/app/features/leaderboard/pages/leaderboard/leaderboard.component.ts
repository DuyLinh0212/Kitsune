// frontend/Kitsune.Web.User/src/app/features/leaderboard/pages/leaderboard/leaderboard.component.ts
import { Component, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { from } from 'rxjs';
import { supabase } from '../../../../core/supabase/supabase.client';

interface LeaderboardEntry {
  userId: number;
  rank: number;
  username: string;
  fullName: string;
  quizCount: number;
  avgAccuracy: number;
  totalCorrect: number;
  totalQuestions: number;
  lastAttemptDate: string;
}

@Component({
  selector: 'app-leaderboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './leaderboard.component.html',
  styleUrl: './leaderboard.component.css'
})
export class LeaderboardComponent implements OnInit {
  readonly entries = signal<LeaderboardEntry[]>([]);
  readonly isLoading = signal(true);
  readonly toast = signal<{ message: string; type: 'success' | 'error' } | null>(null);

  readonly topThree = computed(() => this.entries().slice(0, 3));
  readonly restEntries = computed(() => this.entries().slice(3));

  getMedalEmoji(rank: number): string {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return '';
  }

  getMedalClass(rank: number): string {
    if (rank === 1) return 'gold';
    if (rank === 2) return 'silver';
    if (rank === 3) return 'bronze';
    return '';
  }

  getInitials(name: string): string {
    const parts = (name || 'U').trim().split(/\s+/);
    if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? 'U';
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  ngOnInit(): void {
    this.loadLeaderboard();
  }

  loadLeaderboard(): void {
    this.isLoading.set(true);
    from(
      supabase
        .from('QuizAttempts')
        .select('Id, UserId, AccuracyPercentage, CorrectAnswersCount, TotalQuestionsCount, CreatedAt, Users:UserId(Username, FullName)')
        .order('CreatedAt', { ascending: false })
        .limit(500)
    ).subscribe({
      next: ({ data, error }) => {
        if (error) {
          this.showToast('Không thể tải bảng xếp hạng', 'error');
          this.isLoading.set(false);
          return;
        }

        // Group by UserId and aggregate
        const userMap = new Map<number, {
          userId: number;
          username: string;
          fullName: string;
          quizCount: number;
          totalAccuracy: number;
          totalCorrect: number;
          totalQuestions: number;
          lastAttemptDate: string;
        }>();

        for (const row of (data ?? []) as unknown as Array<{
          UserId: number;
          AccuracyPercentage: number;
          CorrectAnswersCount: number;
          TotalQuestionsCount: number;
          CreatedAt: string;
          Users: { Username: string; FullName: string | null } | { Username: string; FullName: string | null }[] | null;
        }>) {
          const usersRaw = row.Users;
          const users = Array.isArray(usersRaw) ? (usersRaw[0] ?? null) : usersRaw;
          const uid = row.UserId;
          const existing = userMap.get(uid);
          if (existing) {
            existing.quizCount += 1;
            existing.totalAccuracy += row.AccuracyPercentage ?? 0;
            existing.totalCorrect += row.CorrectAnswersCount ?? 0;
            existing.totalQuestions += row.TotalQuestionsCount ?? 0;
          } else {
            userMap.set(uid, {
              userId: uid,
              username: users?.Username || 'unknown',
              fullName: users?.FullName || users?.Username || 'Ẩn danh',
              quizCount: 1,
              totalAccuracy: row.AccuracyPercentage ?? 0,
              totalCorrect: row.CorrectAnswersCount ?? 0,
              totalQuestions: row.TotalQuestionsCount ?? 0,
              lastAttemptDate: row.CreatedAt,
            });
          }
        }

        // Build sorted entries
        const sorted: LeaderboardEntry[] = Array.from(userMap.values())
          .map((u) => ({
            userId: u.userId,
            rank: 0,
            username: u.username,
            fullName: u.fullName,
            quizCount: u.quizCount,
            avgAccuracy: u.quizCount > 0 ? Math.round(u.totalAccuracy / u.quizCount) : 0,
            totalCorrect: u.totalCorrect,
            totalQuestions: u.totalQuestions,
            lastAttemptDate: u.lastAttemptDate,
          }))
          .sort((a, b) => b.avgAccuracy - a.avgAccuracy || b.quizCount - a.quizCount)
          .map((e, i) => ({ ...e, rank: i + 1 }));

        this.entries.set(sorted);
        this.isLoading.set(false);
      },
      error: () => {
        this.showToast('Lỗi kết nối', 'error');
        this.isLoading.set(false);
      }
    });
  }

  private showToast(message: string, type: 'success' | 'error'): void {
    this.toast.set({ message, type });
    setTimeout(() => this.toast.set(null), 3000);
  }
}
