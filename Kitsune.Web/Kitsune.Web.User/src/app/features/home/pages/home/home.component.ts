// frontend/Kitsune.Web.User/src/app/features/home/pages/home/home.component.ts
import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { AuthService } from '../../../../core/services/auth.service';
import { UserStatsService } from '../../../../core/services/user-stats.service';
import { UserProfile } from '../../../../core/models/auth.model';
import { supabase } from '../../../../core/supabase/supabase.client';
import { LoadingFoxComponent } from '../../../../shared/components/loading-fox/loading-fox.component';

// ── Interfaces ──────────────────────────────────────────────────────────────
interface FolderItem {
  id: number;
  name: string;
  vocabCount: number;
}

interface QuizItem {
  id: number;
  title: string;
  lastAccuracy: number | null;
  lastAttemptDate: string | null;
}

interface LeaderboardItem {
  rank: number;
  name: string;
  accuracy: number;
  quizCount: number;
  correctAnswers: number;
}

interface SearchResult {
  id: number;
  type: 'vocab' | 'kanji';
  primary: string;
  reading: string;
  meaning: string;
}

// ── Component ────────────────────────────────────────────────────────────────
@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [CommonModule, FormsModule, LoadingFoxComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly userStatsService = inject(UserStatsService);
  protected readonly router = inject(Router);
  protected readonly Math = Math;

  // ── Signals ──────────────────────────────────────────────────────────────
  readonly currentUser    = signal<UserProfile | null>(this.authService.getStoredUser());
  
  readonly streak = computed(() => this.userStatsService.stats().streak);
  readonly totalXP = computed(() => this.userStatsService.stats().totalXP);
  readonly srsCardsDue = computed(() => this.userStatsService.stats().srsCardsDue);

  readonly folders        = signal<FolderItem[]>([]);
  readonly myQuizzes      = signal<QuizItem[]>([]);
  readonly leaderboard    = signal<LeaderboardItem[]>([]);
  readonly isLoading      = signal(true);
  readonly srsWeekData    = signal<number[]>([0, 0, 0, 0, 0, 0, 0]);

  // Unified search
  readonly unifiedSearch    = signal('');
  readonly searchResults    = signal<SearchResult[]>([]);
  readonly isSearching      = signal(false);
  readonly showSearchDrop   = signal(false);
  private searchTimeout: ReturnType<typeof setTimeout> | null = null;

  // ── Lifecycle ─────────────────────────────────────────────────────────────
  async ngOnInit(): Promise<void> {
    try {
      const userId = await this.resolveUserId();
      if (!userId) return;

      // UserStatsService automatically fetches streak, XP, srsCardsDue.
      // We just need to load folders, quizzes, leaderboard, and SRS week data.
      await Promise.all([
        this.loadFolders(userId),
        this.loadMyQuizzes(userId),
        this.loadLeaderboard(),
        this.loadSrsWeekData(userId),
      ]);
    } catch (err) {
      console.error('[Home] Error loading dashboard data:', err);
    } finally {
      this.isLoading.set(false);
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  private async resolveUserId(): Promise<number | null> {
    try {
      const { data: authData } = await supabase.auth.getUser();
      const email = authData.user?.email;
      if (!email) return null;

      const { data, error } = await supabase
        .from('Users')
        .select('Id')
        .eq('Email', email)
        .maybeSingle();

      if (error || !data) return null;
      return (data as { Id: number }).Id;
    } catch {
      return null;
    }
  }

  // Removed loadStreak, loadXP, loadSrsCount as they are now in UserStatsService.

  private async loadSrsWeekData(userId: number): Promise<void> {
    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);

      const { data, error } = await supabase
        .from('QuizAttempts')
        .select('CreatedAt')
        .eq('UserId', userId)
        .gte('CreatedAt', sevenDaysAgo.toISOString());

      if (error || !data) return;

      const counts = [0, 0, 0, 0, 0, 0, 0];
      const today = new Date();
      for (const row of data as { CreatedAt: string }[]) {
        const date = new Date(row.CreatedAt);
        const diffDays = Math.round(
          (today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
        );
        const idx = 6 - diffDays;
        if (idx >= 0 && idx < 7) counts[idx]++;
      }
      this.srsWeekData.set(counts);
    } catch (e) {
      console.warn('[Home] SRS week data load failed', e);
    }
  }

  private async loadFolders(userId: number): Promise<void> {
    try {
      const { data, error } = await supabase
        .from('VocabularyFolder')
        .select('Id, FolderName, Description')
        .eq('UserId', userId)
        .order('CreatedAt', { ascending: false })
        .limit(4);

      if (error || !data) return;

      const folderRows = data as { Id: number; FolderName: string }[];

      const withCounts = await Promise.all(
        folderRows.map(async (f) => {
          try {
            const { count } = await supabase
              .from('Vocabularies')
              .select('Id', { count: 'exact', head: true })
              .eq('FolderId', f.Id);
            return { id: f.Id, name: f.FolderName, vocabCount: count ?? 0 };
          } catch {
            return { id: f.Id, name: f.FolderName, vocabCount: 0 };
          }
        })
      );

      this.folders.set(withCounts);
    } catch (e) {
      console.warn('[Home] Folders load failed', e);
    }
  }

  private async loadMyQuizzes(userId: number): Promise<void> {
    try {
      const { data: quizzes, error } = await supabase
        .from('Quizzes')
        .select('Id, Title, CreatedAt')
        .eq('CreatorId', userId)
        .order('CreatedAt', { ascending: false })
        .limit(4);

      if (error || !quizzes) return;

      const quizRows = quizzes as { Id: number; Title: string; CreatedAt: string }[];

      const withAttempts = await Promise.all(
        quizRows.map(async (q) => {
          try {
            const { data: attempts } = await supabase
              .from('QuizAttempts')
              .select('AccuracyPercentage, CreatedAt')
              .eq('QuizId', q.Id)
              .eq('UserId', userId)
              .order('CreatedAt', { ascending: false })
              .limit(1);

            const last = attempts && attempts.length > 0
              ? (attempts[0] as { AccuracyPercentage: number; CreatedAt: string })
              : null;

            return {
              id: q.Id,
              title: q.Title,
              lastAccuracy: last ? last.AccuracyPercentage : null,
              lastAttemptDate: last ? last.CreatedAt : null,
            };
          } catch {
            return { id: q.Id, title: q.Title, lastAccuracy: null, lastAttemptDate: null };
          }
        })
      );

      this.myQuizzes.set(withAttempts);
    } catch (e) {
      console.warn('[Home] My quizzes load failed', e);
    }
  }

  private async loadLeaderboard(): Promise<void> {
    try {
      const { data, error } = await supabase
        .from('QuizAttempts')
        .select('UserId, AccuracyPercentage, CorrectAnswersCount, Users:UserId(Username, FullName)')
        .order('CreatedAt', { ascending: false })
        .limit(200);

      if (error || !data) return;

      const userMap = new Map<number, {
        name: string;
        quizCount: number;
        totalAccuracy: number;
        totalCorrect: number;
      }>();

      for (const row of (data as unknown as Array<{
        UserId: number;
        AccuracyPercentage: number;
        CorrectAnswersCount: number;
        Users: { Username: string; FullName: string | null } | { Username: string; FullName: string | null }[] | null;
      }>)) {
        const usersRaw = row.Users;
        const users = Array.isArray(usersRaw) ? (usersRaw[0] ?? null) : usersRaw;
        const uid = row.UserId;
        const name = users?.FullName || users?.Username || 'Ẩn danh';
        const existing = userMap.get(uid);
        if (existing) {
          existing.quizCount += 1;
          existing.totalAccuracy += row.AccuracyPercentage ?? 0;
          existing.totalCorrect += row.CorrectAnswersCount ?? 0;
        } else {
          userMap.set(uid, {
            name,
            quizCount: 1,
            totalAccuracy: row.AccuracyPercentage ?? 0,
            totalCorrect: row.CorrectAnswersCount ?? 0,
          });
        }
      }

      const sorted: LeaderboardItem[] = Array.from(userMap.values())
        .map((u) => ({
          rank: 0,
          name: u.name,
          accuracy: u.quizCount > 0 ? Math.round(u.totalAccuracy / u.quizCount) : 0,
          quizCount: u.quizCount,
          correctAnswers: u.totalCorrect,
        }))
        .sort((a, b) => b.accuracy - a.accuracy || b.quizCount - a.quizCount)
        .slice(0, 5)
        .map((e, i) => ({ ...e, rank: i + 1 }));

      this.leaderboard.set(sorted);
    } catch (e) {
      console.warn('[Home] Leaderboard load failed', e);
    }
  }

  // ── Unified search ────────────────────────────────────────────────────────
  onUnifiedInput(val: string): void {
    this.unifiedSearch.set(val);
    if (this.searchTimeout) clearTimeout(this.searchTimeout);
    if (!val.trim()) {
      this.searchResults.set([]);
      this.showSearchDrop.set(false);
      return;
    }
    this.searchTimeout = setTimeout(() => void this.runUnifiedSearch(val.trim()), 300);
  }

  private async runUnifiedSearch(q: string): Promise<void> {
    this.isSearching.set(true);
    this.showSearchDrop.set(true);
    try {
      const [{ data: vocabData }, { data: kanjiData }] = await Promise.all([
        supabase
          .from('Vocabularies')
          .select('Id, Word, Reading, Meaning')
          .ilike('Word', `%${q}%`)
          .limit(5),
        supabase
          .from('Kanjis')
          .select('Id, Character, OnReading, Meaning')
          .or(`Character.ilike.%${q}%,Meaning.ilike.%${q}%`)
          .limit(5),
      ]);

      const results: SearchResult[] = [];
      for (const row of (vocabData ?? []) as { Id: number; Word: string; Reading: string | null; Meaning: string | null }[]) {
        results.push({ id: row.Id, type: 'vocab', primary: row.Word, reading: row.Reading ?? '', meaning: row.Meaning ?? '' });
      }
      for (const row of (kanjiData ?? []) as { Id: number; Character: string; OnReading: string | null; Meaning: string | null }[]) {
        results.push({ id: row.Id, type: 'kanji', primary: row.Character, reading: row.OnReading ?? '', meaning: row.Meaning ?? '' });
      }
      this.searchResults.set(results);
    } catch (e) {
      console.warn('[Home] Unified search failed', e);
    } finally {
      this.isSearching.set(false);
    }
  }

  navigateToResult(result: SearchResult): void {
    this.showSearchDrop.set(false);
    this.unifiedSearch.set('');
    this.searchResults.set([]);
    if (result.type === 'vocab') {
      this.router.navigate(['/vocabulary'], { queryParams: { q: result.primary } });
    } else {
      this.router.navigate(['/kanji'], { queryParams: { q: result.primary } });
    }
  }

  closeSearch(): void {
    this.showSearchDrop.set(false);
  }

  // ── Computed helpers ──────────────────────────────────────────────────────
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

  get maxWeekValue(): number {
    return Math.max(...this.srsWeekData(), 1);
  }

  getBarHeight(val: number): number {
    return Math.round((val / this.maxWeekValue) * 100);
  }

  getDayLabel(offsetFromEnd: number): string {
    const days = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    const today = new Date();
    const d = new Date(today);
    d.setDate(d.getDate() - (6 - offsetFromEnd));
    return days[d.getDay()];
  }

  formatAttemptDate(dateStr: string | null): string {
    if (!dateStr) return 'Chưa làm';
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Hôm nay';
    if (diffDays === 1) return 'Hôm qua';
    if (diffDays < 7) return `${diffDays} ngày trước`;
    return d.toLocaleDateString('vi-VN');
  }

  getFolderColor(index: number): string {
    const colors = ['folder-blue', 'folder-green', 'folder-yellow', 'folder-purple'];
    return colors[index % colors.length];
  }

  getRankMedal(rank: number): string {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `${rank}`;
  }
}
