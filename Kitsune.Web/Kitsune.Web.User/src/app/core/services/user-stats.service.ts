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
      const { data, error } = await supabase
        .from('QuizAttempts')
        .select('CreatedAt')
        .eq('UserId', userId)
        .order('CreatedAt', { ascending: false });

      if (error || !data) return 0;

      const dates = new Set<string>();
      // Convert DB dates to local date string (YYYY-MM-DD)
      for (const row of data as { CreatedAt: string }[]) {
        const localDate = new Date(row.CreatedAt);
        const year = localDate.getFullYear();
        const month = String(localDate.getMonth() + 1).padStart(2, '0');
        const day = String(localDate.getDate()).padStart(2, '0');
        dates.add(`${year}-${month}-${day}`);
      }

      // Merge with local active dates (to track logins/visits)
      if (typeof window !== 'undefined') {
        const storageKey = `kitsune.active_dates.${userId}`;
        const stored = window.localStorage.getItem(storageKey);
        let localDates: string[] = [];
        if (stored) {
          try { localDates = JSON.parse(stored); } catch {}
        }
        
        const todayStr = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`;
        if (!localDates.includes(todayStr)) {
          localDates.push(todayStr);
          window.localStorage.setItem(storageKey, JSON.stringify(localDates));
        }
        
        for (const d of localDates) {
          dates.add(d);
        }
      }

      let count = 0;
      const today = new Date();
      for (let i = 0; i < 365; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const key = `${year}-${month}-${day}`;
        
        if (i === 0 && !dates.has(key)) {
          continue; // It's okay if they haven't studied today yet
        }

        if (dates.has(key)) {
          count++;
        } else {
          break;
        }
      }
      return count;
    } catch {
      return 0;
    }
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
