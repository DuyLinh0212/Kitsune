import { Injectable, inject, signal } from '@angular/core';
import { supabase } from '../supabase/supabase.client';
import { AuthService } from './auth.service';

export interface UserStats {
  streak: number;
  totalXP: number;
  srsCardsDue: number;
}

@Injectable({ providedIn: 'root' })
export class UserStatsService {
  private readonly authService = inject(AuthService);

  readonly stats = signal<UserStats>({
    streak: 0,
    totalXP: 0,
    srsCardsDue: 0,
  });

  constructor() {
    this.authService.currentUser$.subscribe((user) => {
      if (user) {
        this.loadAllStats(user.id);
      } else {
        this.stats.set({ streak: 0, totalXP: 0, srsCardsDue: 0 });
      }
    });
  }

  async loadAllStats(userId: number): Promise<void> {
    const [streak, xp, dueCards] = await Promise.all([
      this.fetchStreak(userId),
      this.fetchXP(userId),
      this.fetchSrsDue(userId),
    ]);

    this.stats.set({
      streak,
      totalXP: xp,
      srsCardsDue: dueCards,
    });
  }

  private async fetchStreak(userId: number): Promise<number> {
    try {
      const [{ data: quizzes, error: quizError }, { data: exams, error: examError }, { data: cards, error: cardError }] = await Promise.all([
        supabase.from('QuizAttempts').select('CreatedAt').eq('UserId', userId),
        supabase.from('ExamAttempts').select('CreatedAt').eq('UserId', userId),
        supabase.from('SRSCards').select('Id').eq('UserId', userId)
      ]);
      if (quizError || examError || cardError) throw quizError ?? examError ?? cardError;

      const cardIds = (cards ?? []).map((card) => card.Id as number);
      const { data: reviews, error: reviewError } = cardIds.length
        ? await supabase.from('SRSReviewLogs').select('ReviewedAt').in('CardId', cardIds)
        : { data: [], error: null };
      if (reviewError) throw reviewError;

      const activityDates = new Set<string>();
      for (const row of [...(quizzes ?? []), ...(exams ?? [])] as Array<{ CreatedAt: string }>) {
        activityDates.add(this.toLocalDate(row.CreatedAt));
      }
      for (const row of (reviews ?? []) as Array<{ ReviewedAt: string }>) {
        activityDates.add(this.toLocalDate(row.ReviewedAt));
      }
      return this.calculateStreak(activityDates);
    } catch {
      return 0;
    }
  }

  private toLocalDate(timestamp: string): string {
    const date = new Date(timestamp);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  private calculateStreak(activityDates: ReadonlySet<string>): number {
    const cursor = new Date();
    if (!activityDates.has(this.toLocalDate(cursor.toISOString()))) cursor.setDate(cursor.getDate() - 1);
    if (!activityDates.has(this.toLocalDate(cursor.toISOString()))) return 0;

    let streak = 0;
    while (activityDates.has(this.toLocalDate(cursor.toISOString()))) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    }
    return streak;
  }

  private async fetchXP(userId: number): Promise<number> {
    try {
      const { data, error } = await supabase
        .from('QuizAttempts')
        .select('CorrectAnswersCount')
        .eq('UserId', userId);

      if (error || !data) return 0;
      return (data as { CorrectAnswersCount: number }[]).reduce(
        (sum, r) => sum + (r.CorrectAnswersCount ?? 0) * 10,
        0
      );
    } catch {
      return 0;
    }
  }

  private async fetchSrsDue(userId: number): Promise<number> {
    try {
      const now = new Date().toISOString();
      const { count, error } = await supabase
        .from('SRSCards')
        .select('Id', { count: 'exact', head: true })
        .eq('UserId', userId)
        .or(`NextReviewDate.lte.${now},BoxLevel.eq.0`);

      if (error) return 0;
      return count ?? 0;
    } catch {
      return 0;
    }
  }

  refresh(): void {
    const user = this.authService.getStoredUser();
    if (user) {
      void this.loadAllStats(user.id);
    }
  }
}
