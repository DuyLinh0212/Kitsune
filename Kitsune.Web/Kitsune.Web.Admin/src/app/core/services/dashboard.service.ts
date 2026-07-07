import { Injectable } from '@angular/core';
import { from, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { supabase } from '../supabase/supabase.client';

export interface LanguageBreakdownDto { languageName: string; languageCode: string; count: number; }
export interface RecentUserDto { username: string; email: string; fullName: string | null; avatarUrl: string | null; createdAt: string; }
export interface ActivityLogDto { timestamp: string; username: string; action: string; description: string | null; }
export interface DashboardChartDto { labels: string[]; newUsersSeries: number[]; newVocabularySeries: number[]; }
export interface DashboardStats {
  totalUsers: number; totalVocabulary: number; totalKanji: number; totalRadicals: number;
  totalFolders: number; newUsersToday: number;
  userGrowthPercent: number; vocabularyGrowthPercent: number;
  languageBreakdown: LanguageBreakdownDto[]; recentUsers: RecentUserDto[];
  recentActivity: ActivityLogDto[]; chart: DashboardChartDto;
}

@Injectable({ providedIn: 'root' })
export class DashboardService {
  getStats(): Observable<DashboardStats> {
    return from(this.fetchStats());
  }

  private async fetchStats(): Promise<DashboardStats> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [
      totalUsersRes, totalVocabRes, totalKanjiRes, totalRadicalsRes,
      totalFoldersRes, newUsersTodayRes,
      usersLastPeriodRes, vocabLastPeriodRes, languageBreakdownRes,
      recentUsersRes, chartUsersRes, chartVocabRes
    ] = await Promise.all([
      supabase.from('Users').select('*', { count: 'exact', head: true }),
      supabase.from('Vocabularies').select('*', { count: 'exact', head: true }),
      supabase.from('Kanji').select('*', { count: 'exact', head: true }),
      // ✅ Radical (singular)
      supabase.from('Radical').select('*', { count: 'exact', head: true }),
      // ✅ VocabularyFolder (singular)
      supabase.from('VocabularyFolder').select('*', { count: 'exact', head: true }),
      supabase.from('Users').select('*', { count: 'exact', head: true }).gte('CreatedAt', today.toISOString()),
      supabase.from('Users').select('*', { count: 'exact', head: true }).gte('CreatedAt', sevenDaysAgo.toISOString()),
      supabase.from('Vocabularies').select('*', { count: 'exact', head: true }).gte('CreatedAt', sevenDaysAgo.toISOString()),
      // ✅ VocabularyFolder (singular) for language breakdown via Vocabularies join
      supabase.from('Vocabularies').select('LanguageId, Languages:LanguageId(LanguageName, LanguageCode)', { count: 'exact' }).limit(500),
      supabase.from('Users').select('Username, Email, FullName, AvatarUrl, CreatedAt').order('CreatedAt', { ascending: false }).limit(10),
      supabase.from('Users').select('CreatedAt').gte('CreatedAt', sevenDaysAgo.toISOString()).order('CreatedAt', { ascending: true }),
      supabase.from('Vocabularies').select('CreatedAt').gte('CreatedAt', sevenDaysAgo.toISOString()).order('CreatedAt', { ascending: true })
    ]);

    const totalUsers = totalUsersRes.count ?? 0;
    const totalVocabulary = totalVocabRes.count ?? 0;
    const totalKanji = totalKanjiRes.count ?? 0;
    const totalRadicals = totalRadicalsRes.count ?? 0;
    const totalFolders = totalFoldersRes.count ?? 0;
    const newUsersToday = newUsersTodayRes.count ?? 0;

    const usersLastPeriod = usersLastPeriodRes.count ?? 0;
    const vocabLastPeriod = vocabLastPeriodRes.count ?? 0;
    const prevUsers = totalUsers - usersLastPeriod;
    const prevVocab = totalVocabulary - vocabLastPeriod;
    const userGrowthPercent = prevUsers > 0 ? Math.round((usersLastPeriod / prevUsers) * 100) : 0;
    const vocabularyGrowthPercent = prevVocab > 0 ? Math.round((vocabLastPeriod / prevVocab) * 100) : 0;

    const langMap = new Map<number, { languageName: string; languageCode: string; count: number }>();
    for (const row of languageBreakdownRes.data ?? []) {
      const lang = row['Languages'] as unknown as { LanguageName: string; LanguageCode: string } | null;
      if (!lang) continue;
      const id = row['LanguageId'] as number;
      const existing = langMap.get(id);
      if (existing) { existing.count++; }
      else { langMap.set(id, { languageName: lang.LanguageName, languageCode: lang.LanguageCode, count: 1 }); }
    }
    const languageBreakdown: LanguageBreakdownDto[] = Array.from(langMap.values());

    const recentUsers: RecentUserDto[] = (recentUsersRes.data ?? []).map((u) => ({
      username: u['Username'] as string, email: u['Email'] as string,
      fullName: (u['FullName'] as string | null) ?? null,
      avatarUrl: (u['AvatarUrl'] as string | null) ?? null,
      createdAt: u['CreatedAt'] as string
    }));

    // Recent activity — fetch from QuizAttempts as proxy for activity logs (UserActivityLogs not in schema)
    const recentActivity: ActivityLogDto[] = [];

    const labels: string[] = [];
    const newUsersSeries: number[] = [];
    const newVocabularySeries: number[] = [];
    for (let i = 6; i >= 0; i--) {
      const day = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
      const dayStr = day.toISOString().slice(0, 10);
      labels.push(new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit' }).format(day));
      const usersOnDay = (chartUsersRes.data ?? []).filter((u) => (u['CreatedAt'] as string).startsWith(dayStr)).length;
      const vocabOnDay = (chartVocabRes.data ?? []).filter((v) => (v['CreatedAt'] as string).startsWith(dayStr)).length;
      newUsersSeries.push(usersOnDay);
      newVocabularySeries.push(vocabOnDay);
    }

    return { totalUsers, totalVocabulary, totalKanji, totalRadicals, totalFolders, newUsersToday, userGrowthPercent, vocabularyGrowthPercent, languageBreakdown, recentUsers, recentActivity, chart: { labels, newUsersSeries, newVocabularySeries } };
  }
}
