// Kitsune.Web/Kitsune.Web.User/src/app/core/services/topic.service.ts
import { Injectable } from '@angular/core';
import { from, Observable } from 'rxjs';
import { GameVocabulary, LessonDetail, LessonItem, LessonSummary, MinigameType, TopicSummary } from '../models/topic.model';
import { supabase } from '../supabase/supabase.client';

interface TopicRow {
  Id: number;
  Title: string;
  Description: string | null;
  ImageUrl: string | null;
  JlptLevel: number | null;
}

interface LessonRow {
  Id: number;
  TopicId: number;
  Title: string;
  Description: string | null;
  OrderIndex: number;
  EstimatedMinutes: number;
  Topic?: { Title: string } | null;
}

interface LessonItemRow {
  Id: number;
  LessonId: number;
  VocabularyId: number | null;
  KanjiId: number | null;
  OrderIndex: number;
  ExampleSentence: string | null;
  ExampleTranslation: string | null;
  Vocabulary: { Word: string; Pronunciation: string | null; Meaning: string } | null;
  Kanji: { Character: string; Onyomi: string | null; Kunyomi: string | null; Meaning: string } | null;
}

interface ProgressRow {
  LessonId: number;
  CompletedItemCount: number;
}

@Injectable({ providedIn: 'root' })
export class TopicService {
  getTopics(): Observable<TopicSummary[]> {
    return from(this.loadTopics());
  }

  getLessons(topicId?: number): Observable<LessonSummary[]> {
    return from(this.loadLessons(topicId));
  }

  getLesson(lessonId: number): Observable<LessonDetail> {
    return from(this.loadLesson(lessonId));
  }

  updateProgress(lessonId: number, completedItemCount: number, totalItems: number, lastItemId?: number): Observable<void> {
    return from(this.saveProgress(lessonId, completedItemCount, totalItems, lastItemId));
  }

  getGameVocabulary(limit = 20): Observable<GameVocabulary[]> {
    return from(this.loadGameVocabulary(limit));
  }

  recordGame(type: MinigameType, score: number, correct: number, wrong: number, durationSeconds: number): Observable<void> {
    return from(this.saveGame(type, score, correct, wrong, durationSeconds));
  }

  private async loadTopics(): Promise<TopicSummary[]> {
    const [{ data: topics, error: topicError }, { data: lessons, error: lessonError }, { data: items, error: itemError }, progress] = await Promise.all([
      supabase.from('Topics').select('Id, Title, Description, ImageUrl, JlptLevel').eq('IsPublished', true).order('CreatedAt'),
      supabase.from('Lessons').select('Id, TopicId').eq('IsPublished', true),
      supabase.from('LessonItems').select('LessonId'),
      this.loadProgress(),
    ]);
    if (topicError) throw topicError;
    if (lessonError) throw lessonError;
    if (itemError) throw itemError;

    const progressMap = new Map(progress.map((row) => [row.LessonId, row.CompletedItemCount]));
    const itemCounts = new Map<number, number>();
    for (const item of items ?? []) itemCounts.set(item.LessonId, (itemCounts.get(item.LessonId) ?? 0) + 1);
    return ((topics ?? []) as TopicRow[]).map((topic) => {
      const topicLessons = (lessons ?? []).filter((lesson) => lesson.TopicId === topic.Id);
      const completed = topicLessons.filter((lesson) => {
        const itemCount = itemCounts.get(lesson.Id) ?? 0;
        return itemCount > 0 && (progressMap.get(lesson.Id) ?? 0) >= itemCount;
      }).length;
      const totalItems = topicLessons.reduce((sum, lesson) => sum + (itemCounts.get(lesson.Id) ?? 0), 0);
      const completedItems = topicLessons.reduce((sum, lesson) => {
        const itemCount = itemCounts.get(lesson.Id) ?? 0;
        return sum + Math.min(progressMap.get(lesson.Id) ?? 0, itemCount);
      }, 0);
      return {
        id: topic.Id,
        title: topic.Title,
        description: topic.Description ?? '',
        imageUrl: topic.ImageUrl,
        jlptLevel: topic.JlptLevel,
        lessonCount: topicLessons.length,
        completedLessonCount: completed,
        progressPercent: totalItems === 0 ? 0 : Math.round((completedItems / totalItems) * 100),
      };
    });
  }

  private async loadLessons(topicId?: number): Promise<LessonSummary[]> {
    let query = supabase
      .from('Lessons')
      .select('Id, TopicId, Title, Description, OrderIndex, EstimatedMinutes')
      .eq('IsPublished', true)
      .order('OrderIndex');
    if (topicId != null) query = query.eq('TopicId', topicId);
    const { data, error } = await query;
    if (error) throw error;
    const rows = (data ?? []) as LessonRow[];
    const lessonIds = rows.map((row) => row.Id);
    const [itemCounts, progress] = await Promise.all([this.loadItemCounts(lessonIds), this.loadProgress(lessonIds)]);
    const progressMap = new Map(progress.map((row) => [row.LessonId, row.CompletedItemCount]));
    return rows.map((row) => this.mapLesson(row, itemCounts.get(row.Id) ?? 0, progressMap.get(row.Id) ?? 0));
  }

  private async loadLesson(lessonId: number): Promise<LessonDetail> {
    const [{ data: lesson, error: lessonError }, { data: itemData, error: itemError }, progress] = await Promise.all([
      supabase.from('Lessons').select('Id, TopicId, Title, Description, OrderIndex, EstimatedMinutes, Topic:TopicId(Title)').eq('Id', lessonId).single(),
      supabase.from('LessonItems').select('Id, LessonId, VocabularyId, KanjiId, OrderIndex, ExampleSentence, ExampleTranslation, Vocabulary:VocabularyId(Word, Pronunciation, Meaning), Kanji:KanjiId(Character, Onyomi, Kunyomi, Meaning)').eq('LessonId', lessonId).order('OrderIndex'),
      this.loadProgress([lessonId]),
    ]);
    if (lessonError) throw lessonError;
    if (itemError) throw itemError;
    const row = lesson as unknown as LessonRow;
    const items = ((itemData ?? []) as unknown as LessonItemRow[]).map((item): LessonItem => ({
      id: item.Id,
      lessonId: item.LessonId,
      vocabularyId: item.VocabularyId,
      kanjiId: item.KanjiId,
      orderIndex: item.OrderIndex,
      word: item.Vocabulary?.Word ?? item.Kanji?.Character ?? '',
      pronunciation: item.Vocabulary?.Pronunciation ?? item.Kanji?.Onyomi ?? item.Kanji?.Kunyomi ?? null,
      meaning: item.Vocabulary?.Meaning ?? item.Kanji?.Meaning ?? '',
      exampleSentence: item.ExampleSentence,
      exampleTranslation: item.ExampleTranslation,
    }));
    const completed = progress[0]?.CompletedItemCount ?? 0;
    return {
      ...this.mapLesson(row, items.length, completed),
      topicTitle: row.Topic?.Title ?? '',
      items,
    };
  }

  private mapLesson(row: LessonRow, itemCount: number, completedItemCount: number): LessonSummary {
    return {
      id: row.Id,
      topicId: row.TopicId,
      title: row.Title,
      description: row.Description ?? '',
      orderIndex: row.OrderIndex,
      estimatedMinutes: row.EstimatedMinutes,
      itemCount,
      completedItemCount: Math.min(completedItemCount, itemCount),
      progressPercent: itemCount === 0 ? 0 : Math.round((Math.min(completedItemCount, itemCount) / itemCount) * 100),
    };
  }

  private async loadItemCounts(lessonIds: number[]): Promise<Map<number, number>> {
    const result = new Map<number, number>();
    if (lessonIds.length === 0) return result;
    const { data, error } = await supabase.from('LessonItems').select('LessonId').in('LessonId', lessonIds);
    if (error) throw error;
    for (const row of data ?? []) result.set(row.LessonId, (result.get(row.LessonId) ?? 0) + 1);
    return result;
  }

  private async loadProgress(lessonIds?: number[]): Promise<ProgressRow[]> {
    const userId = await this.getCurrentUserId(false);
    if (userId == null) return [];
    let query = supabase.from('UserLessonProgress').select('LessonId, CompletedItemCount').eq('UserId', userId);
    if (lessonIds?.length) query = query.in('LessonId', lessonIds);
    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []) as ProgressRow[];
  }

  private async saveProgress(lessonId: number, completedItemCount: number, totalItems: number, lastItemId?: number): Promise<void> {
    const userId = await this.getCurrentUserId(true);
    const completed = Math.max(0, Math.min(completedItemCount, totalItems));
    const now = new Date().toISOString();
    const { error } = await supabase.from('UserLessonProgress').upsert({
      UserId: userId,
      LessonId: lessonId,
      CompletedItemCount: completed,
      LastItemId: lastItemId ?? null,
      LastStudiedAt: now,
      CompletedAt: totalItems > 0 && completed >= totalItems ? now : null,
    }, { onConflict: 'UserId,LessonId' });
    if (error) throw error;
  }

  private async loadGameVocabulary(limit: number): Promise<GameVocabulary[]> {
    const { data, error } = await supabase
      .from('Vocabularies')
      .select('Id, Word, Pronunciation, Meaning')
      .not('Pronunciation', 'is', null)
      .limit(Math.max(10, Math.min(80, limit * 3)));
    if (error) throw error;
    const shuffled = [...(data ?? [])].sort(() => Math.random() - 0.5).slice(0, limit);
    return shuffled.map((row) => ({ id: row.Id, word: row.Word, pronunciation: row.Pronunciation ?? '', meaning: row.Meaning }));
  }

  private async saveGame(type: MinigameType, score: number, correct: number, wrong: number, durationSeconds: number): Promise<void> {
    const userId = await this.getCurrentUserId(true);
    const { error } = await supabase.from('MinigameSessions').insert({
      UserId: userId,
      GameType: type,
      Score: score,
      CorrectCount: correct,
      WrongCount: wrong,
      DurationSeconds: durationSeconds,
    });
    if (error) throw error;
  }

  private async getCurrentUserId(required: boolean): Promise<number | null> {
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError && required) throw authError;
    const email = authData.user?.email;
    if (!email) {
      if (required) throw new Error('Not authenticated');
      return null;
    }
    const { data, error } = await supabase.from('Users').select('Id').eq('Email', email).maybeSingle();
    if (error) throw error;
    if (!data && required) throw new Error('Không tìm thấy hồ sơ người dùng.');
    return data?.Id ?? null;
  }
}
