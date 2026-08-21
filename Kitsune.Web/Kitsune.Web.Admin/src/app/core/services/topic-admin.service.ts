// Kitsune.Web/Kitsune.Web.Admin/src/app/core/services/topic-admin.service.ts
import { Injectable } from '@angular/core';
import { from, Observable } from 'rxjs';
import { supabase } from '../supabase/supabase.client';

export interface AdminLesson {
  id: number;
  topicId: number;
  title: string;
  description: string;
  orderIndex: number;
  estimatedMinutes: number;
  isPublished: boolean;
  itemCount: number;
}

export interface AdminTopic {
  id: number;
  title: string;
  description: string;
  jlptLevel: number | null;
  isPublished: boolean;
  lessons: AdminLesson[];
}

export type CatalogItemType = 'vocabulary' | 'kanji';
export interface FolderLearningItem {
  key: string;
  lessonItemId?: number;
  itemType: CatalogItemType;
  vocabularyId: number | null;
  kanjiId: number | null;
  word: string;
  pronunciation: string;
  meaning: string;
}

export interface AiLessonPlan {
  title: string;
  description: string;
  estimatedMinutes: number;
  vocabularyIds: number[];
  kanjiIds: number[];
}

export interface AiTopicPlan { topicDescription: string; lessons: AiLessonPlan[]; }
export interface AiTopicCreation { topic: AdminTopic; plan: AiTopicPlan; }

interface LessonItemRow {
  Id: number;
  VocabularyId: number | null;
  KanjiId: number | null;
  Vocabulary: { Word: string; Pronunciation: string | null; Meaning: string } | null;
  Kanji: { Character: string; AmHanViet: string | null; Meaning: string } | null;
}

@Injectable({ providedIn: 'root' })
export class TopicAdminService {
  getTopics(): Observable<AdminTopic[]> { return from(this.loadTopics()); }
  getLessonItems(lessonId: number): Observable<FolderLearningItem[]> { return from(this.loadLessonItems(lessonId)); }
  searchCatalog(itemType: CatalogItemType, query: string): Observable<FolderLearningItem[]> {
    return from(this.loadCatalogItems(itemType, query));
  }

  createTopic(title: string, description: string, jlptLevel: number | null): Observable<AdminTopic> {
    return from(this.insertTopic(title, description, jlptLevel));
  }

  createLesson(topicId: number, title: string, description: string, estimatedMinutes: number, orderIndex: number): Observable<AdminLesson> {
    return from(this.insertLesson(topicId, title, description, estimatedMinutes, orderIndex));
  }

  setTopicPublished(topicId: number, isPublished: boolean): Observable<void> {
    return from(this.updatePublished('Topics', topicId, isPublished));
  }

  setLessonPublished(lessonId: number, isPublished: boolean): Observable<void> {
    return from(this.updatePublished('Lessons', lessonId, isPublished));
  }

  updateTopic(topicId: number, title: string, description: string, jlptLevel: number | null): Observable<void> {
    return from(this.updateTopicDetails(topicId, title, description, jlptLevel));
  }

  updateLesson(lessonId: number, title: string, description: string, estimatedMinutes: number): Observable<void> {
    return from(this.updateLessonDetails(lessonId, title, description, estimatedMinutes));
  }

  addCatalogItems(lessonId: number, items: FolderLearningItem[]): Observable<number> {
    return from(this.insertLearningItems(lessonId, items, null));
  }

  removeLessonItem(lessonItemId: number): Observable<void> {
    return from(this.deleteLessonItem(lessonItemId));
  }

  generateAndSaveTopic(topicTitle: string, lessonCount: number): Observable<AiTopicCreation> {
    return from(this.generateAndPersistAiPlan(topicTitle, lessonCount));
  }

  private async loadTopics(): Promise<AdminTopic[]> {
    const [{ data: topics, error: topicError }, { data: lessons, error: lessonError }, { data: items, error: itemError }] = await Promise.all([
      supabase.from('Topics').select('Id, Title, Description, JlptLevel, IsPublished').order('CreatedAt', { ascending: false }),
      supabase.from('Lessons').select('Id, TopicId, Title, Description, OrderIndex, EstimatedMinutes, IsPublished').order('OrderIndex'),
      supabase.from('LessonItems').select('LessonId'),
    ]);
    if (topicError) throw topicError;
    if (lessonError) throw lessonError;
    if (itemError) throw itemError;
    const counts = new Map<number, number>();
    for (const item of items ?? []) counts.set(item.LessonId, (counts.get(item.LessonId) ?? 0) + 1);
    return (topics ?? []).map((topic) => ({
      id: topic.Id,
      title: topic.Title,
      description: topic.Description ?? '',
      jlptLevel: topic.JlptLevel,
      isPublished: topic.IsPublished,
      lessons: (lessons ?? []).filter((lesson) => lesson.TopicId === topic.Id).map((lesson) => ({
        id: lesson.Id,
        topicId: lesson.TopicId,
        title: lesson.Title,
        description: lesson.Description ?? '',
        orderIndex: lesson.OrderIndex,
        estimatedMinutes: lesson.EstimatedMinutes,
        isPublished: lesson.IsPublished,
        itemCount: counts.get(lesson.Id) ?? 0,
      })),
    }));
  }

  private async loadCatalogItems(itemType: CatalogItemType, query: string): Promise<FolderLearningItem[]> {
    const term = query.trim().replace(/[,%()."]/g, ' ').replace(/\s+/g, ' ');
    if (!term) return [];
    const pattern = `%${term}%`;
    if (itemType === 'vocabulary') {
      const { data, error } = await supabase
        .from('Vocabularies')
        .select('Id, Word, Pronunciation, Meaning')
        .or(`Word.ilike.${pattern},Pronunciation.ilike.${pattern},Meaning.ilike.${pattern}`)
        .order('Word')
        .limit(60);
      if (error) throw error;
      return (data ?? []).map((row) => ({
        key: `v-${row.Id}`,
        itemType: 'vocabulary',
        vocabularyId: row.Id,
        kanjiId: null,
        word: row.Word,
        pronunciation: row.Pronunciation ?? '',
        meaning: row.Meaning,
      }));
    }

    const { data, error } = await supabase
      .from('Kanji')
      .select('Id, Character, AmHanViet, Meaning')
      .or(`Character.ilike.${pattern},AmHanViet.ilike.${pattern},Meaning.ilike.${pattern}`)
      .order('Character')
      .limit(60);
    if (error) throw error;
    return (data ?? []).map((row) => ({
      key: `k-${row.Id}`,
      itemType: 'kanji',
      vocabularyId: null,
      kanjiId: row.Id,
      word: row.Character,
      pronunciation: row.AmHanViet,
      meaning: row.Meaning,
    }));
  }

  private async insertTopic(title: string, description: string, jlptLevel: number | null): Promise<AdminTopic> {
    const userId = await this.getAdminUserId();
    const { data, error } = await supabase.from('Topics').insert({ Title: title.trim(), Description: description.trim() || null, JlptLevel: jlptLevel, IsPublished: false, CreatedBy: userId }).select('Id, Title, Description, JlptLevel, IsPublished').single();
    if (error) throw error;
    return { id: data.Id, title: data.Title, description: data.Description ?? '', jlptLevel: data.JlptLevel, isPublished: data.IsPublished, lessons: [] };
  }

  private async insertLesson(topicId: number, title: string, description: string, estimatedMinutes: number, orderIndex: number): Promise<AdminLesson> {
    const { data, error } = await supabase.from('Lessons').insert({ TopicId: topicId, Title: title.trim(), Description: description.trim() || null, EstimatedMinutes: estimatedMinutes, OrderIndex: orderIndex, IsPublished: false }).select('Id, TopicId, Title, Description, OrderIndex, EstimatedMinutes, IsPublished').single();
    if (error) throw error;
    return { id: data.Id, topicId: data.TopicId, title: data.Title, description: data.Description ?? '', orderIndex: data.OrderIndex, estimatedMinutes: data.EstimatedMinutes, isPublished: data.IsPublished, itemCount: 0 };
  }

  private async insertLearningItems(lessonId: number, items: FolderLearningItem[], sourceFolderId: number | null): Promise<number> {
    if (!items.length) return 0;
    const vocabularyIds = [...new Set(items.flatMap((item) => item.vocabularyId === null ? [] : [item.vocabularyId]))];
    const [{ data: existing, error: existingError }, { data: components, error: componentError }] = await Promise.all([
      supabase.from('LessonItems').select('VocabularyId, KanjiId, OrderIndex').eq('LessonId', lessonId).order('OrderIndex'),
      vocabularyIds.length
        ? supabase.from('KanjiComponents').select('VocabularyId, KanjiId').in('VocabularyId', vocabularyIds).order('Order')
        : Promise.resolve({ data: [], error: null }),
    ]);
    if (existingError) throw existingError;
    if (componentError) throw componentError;

    const existingVocabularyIds = new Set<number>((existing ?? []).flatMap((item) => item.VocabularyId === null ? [] : [item.VocabularyId]));
    const existingKanjiIds = new Set<number>((existing ?? []).flatMap((item) => item.KanjiId === null ? [] : [item.KanjiId]));
    const relatedKanji = new Map<number, number[]>();
    for (const component of components ?? []) {
      const ids = relatedKanji.get(component.VocabularyId) ?? [];
      ids.push(component.KanjiId);
      relatedKanji.set(component.VocabularyId, ids);
    }
    let orderIndex = Math.max(-1, ...(existing ?? []).map((item) => item.OrderIndex)) + 1;
    const payload: Array<{ LessonId: number; VocabularyId: number | null; KanjiId: number | null; SourceFolderId: number | null; OrderIndex: number }> = [];
    const addVocabulary = (vocabularyId: number): void => {
      if (!existingVocabularyIds.has(vocabularyId)) {
        payload.push({ LessonId: lessonId, VocabularyId: vocabularyId, KanjiId: null, SourceFolderId: sourceFolderId, OrderIndex: orderIndex });
        existingVocabularyIds.add(vocabularyId);
        orderIndex += 1;
      }
      for (const kanjiId of relatedKanji.get(vocabularyId) ?? []) {
        if (existingKanjiIds.has(kanjiId)) continue;
        payload.push({ LessonId: lessonId, VocabularyId: null, KanjiId: kanjiId, SourceFolderId: sourceFolderId, OrderIndex: orderIndex });
        existingKanjiIds.add(kanjiId);
        orderIndex += 1;
      }
    };
    const addKanji = (kanjiId: number): void => {
      if (existingKanjiIds.has(kanjiId)) return;
      payload.push({ LessonId: lessonId, VocabularyId: null, KanjiId: kanjiId, SourceFolderId: sourceFolderId, OrderIndex: orderIndex });
      existingKanjiIds.add(kanjiId);
      orderIndex += 1;
    };
    for (const item of items) {
      if (item.vocabularyId !== null) addVocabulary(item.vocabularyId);
      if (item.kanjiId !== null) addKanji(item.kanjiId);
    }
    if (!payload.length) return 0;
    const { error } = await supabase.from('LessonItems').insert(payload);
    if (error) throw error;
    return payload.length;
  }

  private async updatePublished(table: 'Topics' | 'Lessons', id: number, isPublished: boolean): Promise<void> {
    const { error } = await supabase.from(table).update({ IsPublished: isPublished }).eq('Id', id);
    if (error) throw error;
  }

  private async updateTopicDetails(topicId: number, title: string, description: string, jlptLevel: number | null): Promise<void> {
    const { error } = await supabase.from('Topics').update({
      Title: title.trim(),
      Description: description.trim() || null,
      JlptLevel: jlptLevel,
    }).eq('Id', topicId);
    if (error) throw error;
  }

  private async updateLessonDetails(lessonId: number, title: string, description: string, estimatedMinutes: number): Promise<void> {
    const { error } = await supabase.from('Lessons').update({
      Title: title.trim(),
      Description: description.trim() || null,
      EstimatedMinutes: Math.min(180, Math.max(1, Math.floor(estimatedMinutes))),
    }).eq('Id', lessonId);
    if (error) throw error;
  }

  private async deleteLessonItem(lessonItemId: number): Promise<void> {
    const { error } = await supabase.from('LessonItems').delete().eq('Id', lessonItemId);
    if (error) throw error;
  }

  private async invokeAi(topic: string, lessonCount: number): Promise<AiTopicPlan> {
    const { data, error } = await supabase.functions.invoke<AiTopicPlan>('generate-topic-lessons', { body: { topic: topic.trim(), lessonCount } });
    if (error) throw await this.readFunctionError(error);
    if (!data?.lessons?.length) throw new Error('AI không trả về bài học hợp lệ.');
    return data;
  }

  private async loadLessonItems(lessonId: number): Promise<FolderLearningItem[]> {
    const { data, error } = await supabase
      .from('LessonItems')
      .select('Id, VocabularyId, KanjiId, OrderIndex, Vocabulary:VocabularyId(Word, Pronunciation, Meaning), Kanji:KanjiId(Character, AmHanViet, Meaning)')
      .eq('LessonId', lessonId)
      .order('OrderIndex');
    if (error) throw error;

    return ((data ?? []) as unknown as LessonItemRow[]).flatMap((item): FolderLearningItem[] => {
      if (item.VocabularyId !== null && item.Vocabulary) {
        return [{
          key: `lesson-item-${item.Id}`,
          lessonItemId: item.Id,
          itemType: 'vocabulary' as const,
          vocabularyId: item.VocabularyId,
          kanjiId: null,
          word: item.Vocabulary.Word,
          pronunciation: item.Vocabulary.Pronunciation ?? '',
          meaning: item.Vocabulary.Meaning,
        }];
      }
      if (item.KanjiId !== null && item.Kanji) {
        return [{
          key: `lesson-item-${item.Id}`,
          lessonItemId: item.Id,
          itemType: 'kanji' as const,
          vocabularyId: null,
          kanjiId: item.KanjiId,
          word: item.Kanji.Character,
          pronunciation: item.Kanji.AmHanViet ?? '',
          meaning: item.Kanji.Meaning,
        }];
      }
      return [];
    });
  }

  private async readFunctionError(error: unknown): Promise<Error> {
    const context = (error as { context?: unknown } | null)?.context;
    if (context && typeof (context as Response).clone === 'function') {
      const response = context as Response;
      try {
        const payload = await response.clone().json() as { error?: unknown; message?: unknown };
        const detail = typeof payload.error === 'string' ? payload.error : typeof payload.message === 'string' ? payload.message : '';
        if (detail.trim()) return new Error(detail.trim());
      } catch {
        const detail = await response.clone().text().catch(() => '');
        if (detail.trim()) return new Error(detail.trim());
      }
    }
    return error instanceof Error ? error : new Error('Edge Function không trả về nội dung lỗi hợp lệ.');
  }

  private async generateAndPersistAiPlan(topicTitle: string, lessonCount: number): Promise<AiTopicCreation> {
    const plan = await this.invokeAi(topicTitle, lessonCount);
    const topic = await this.persistAiPlan(topicTitle, plan);
    return { topic, plan };
  }

  private async persistAiPlan(topicTitle: string, plan: AiTopicPlan): Promise<AdminTopic> {
    if (plan.lessons.some((lesson) => lesson.vocabularyIds.length < 20)) {
      throw new Error('Mỗi bài học AI phải có ít nhất 20 từ vựng hợp lệ.');
    }
    const topic = await this.insertTopic(topicTitle, plan.topicDescription, null);
    try {
      for (let index = 0; index < plan.lessons.length; index += 1) {
        const entry = plan.lessons[index];
        const lesson = await this.insertLesson(topic.id, entry.title, entry.description, entry.estimatedMinutes || 10, index);
        const items: FolderLearningItem[] = [
          ...entry.vocabularyIds.map((id) => ({ key: `v-${id}`, itemType: 'vocabulary' as const, vocabularyId: id, kanjiId: null, word: '', pronunciation: '', meaning: '' })),
          ...entry.kanjiIds.map((id) => ({ key: `k-${id}`, itemType: 'kanji' as const, vocabularyId: null, kanjiId: id, word: '', pronunciation: '', meaning: '' })),
        ];
        await this.insertLearningItems(lesson.id, items, null);
      }
    } catch (error) {
      const { error: cleanupError } = await supabase.from('Topics').delete().eq('Id', topic.id);
      if (cleanupError) throw cleanupError;
      throw error;
    }
    return (await this.loadTopics()).find((entry) => entry.id === topic.id) ?? topic;
  }

  private async getAdminUserId(): Promise<number> {
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;
    const email = authData.user?.email;
    if (!email) throw new Error('Not authenticated');
    const { data, error } = await supabase.from('Users').select('Id').eq('Email', email).single();
    if (error) throw error;
    return data.Id;
  }
}
