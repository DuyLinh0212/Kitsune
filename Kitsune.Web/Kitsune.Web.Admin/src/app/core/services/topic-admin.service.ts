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

export interface FolderOption { id: number; name: string; }
export interface FolderLearningItem {
  key: string;
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

@Injectable({ providedIn: 'root' })
export class TopicAdminService {
  getTopics(): Observable<AdminTopic[]> { return from(this.loadTopics()); }
  getFolders(): Observable<FolderOption[]> { return from(this.loadFolders()); }
  getFolderItems(folderId: number): Observable<FolderLearningItem[]> { return from(this.loadFolderItems(folderId)); }

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

  importFolderItems(lessonId: number, folderId: number, items: FolderLearningItem[]): Observable<number> {
    return from(this.insertFolderItems(lessonId, folderId, items));
  }

  generatePlan(topic: string, lessonCount: number): Observable<AiTopicPlan> {
    return from(this.invokeAi(topic, lessonCount));
  }

  savePlan(topicTitle: string, plan: AiTopicPlan): Observable<AdminTopic> {
    return from(this.persistAiPlan(topicTitle, plan));
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

  private async loadFolders(): Promise<FolderOption[]> {
    const { data, error } = await supabase.from('VocabularyFolder').select('Id, FolderName').order('CreatedAt', { ascending: false });
    if (error) throw error;
    return (data ?? []).map((row) => ({ id: row.Id, name: row.FolderName }));
  }

  private async loadFolderItems(folderId: number): Promise<FolderLearningItem[]> {
    const { data: vocabs, error: vocabError } = await supabase
      .from('Vocabularies')
      .select('Id, Word, Pronunciation, Meaning, SpecificData')
      .eq('FolderId', folderId)
      .order('CreatedAt');
    if (vocabError) throw vocabError;
    const vocabIds = (vocabs ?? []).map((row) => row.Id);
    const { data: components, error: componentError } = vocabIds.length
      ? await supabase.from('KanjiComponents').select('VocabularyId, KanjiId, Kanji:KanjiId(Character, AmHanViet, Meaning)').in('VocabularyId', vocabIds).order('Order')
      : { data: [], error: null };
    if (componentError) throw componentError;
    const componentByVocab = new Map<number, { KanjiId: number; Kanji: { Character: string; AmHanViet: string; Meaning: string } | null }>();
    for (const raw of (components ?? []) as unknown[]) {
      const component = raw as { VocabularyId: number; KanjiId: number; Kanji: { Character: string; AmHanViet: string; Meaning: string } | null };
      if (!componentByVocab.has(component.VocabularyId)) componentByVocab.set(component.VocabularyId, component);
    }
    return (vocabs ?? []).map((vocab) => {
      const specificData = vocab.SpecificData as Record<string, unknown> | null;
      const component = componentByVocab.get(vocab.Id);
      const kanjiOnly = specificData?.['_kitsuneItemType'] === 'kanji' && !!component;
      return kanjiOnly
        ? { key: `k-${component!.KanjiId}`, vocabularyId: null, kanjiId: component!.KanjiId, word: component!.Kanji?.Character ?? vocab.Word, pronunciation: component!.Kanji?.AmHanViet ?? '', meaning: component!.Kanji?.Meaning ?? vocab.Meaning }
        : { key: `v-${vocab.Id}`, vocabularyId: vocab.Id, kanjiId: null, word: vocab.Word, pronunciation: vocab.Pronunciation ?? '', meaning: vocab.Meaning };
    });
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

  private async insertFolderItems(lessonId: number, folderId: number, items: FolderLearningItem[]): Promise<number> {
    if (!items.length) return 0;
    const payload = items.map((item, index) => ({ LessonId: lessonId, VocabularyId: item.vocabularyId, KanjiId: item.kanjiId, SourceFolderId: folderId, OrderIndex: index }));
    const { error } = await supabase.from('LessonItems').insert(payload);
    if (error) throw error;
    return payload.length;
  }

  private async updatePublished(table: 'Topics' | 'Lessons', id: number, isPublished: boolean): Promise<void> {
    const { error } = await supabase.from(table).update({ IsPublished: isPublished }).eq('Id', id);
    if (error) throw error;
  }

  private async invokeAi(topic: string, lessonCount: number): Promise<AiTopicPlan> {
    const { data, error } = await supabase.functions.invoke<AiTopicPlan>('generate-topic-lessons', { body: { topic: topic.trim(), lessonCount } });
    if (error) throw error;
    if (!data?.lessons?.length) throw new Error('AI không trả về bài học hợp lệ.');
    return data;
  }

  private async persistAiPlan(topicTitle: string, plan: AiTopicPlan): Promise<AdminTopic> {
    const topic = await this.insertTopic(topicTitle, plan.topicDescription, null);
    for (let index = 0; index < plan.lessons.length; index += 1) {
      const entry = plan.lessons[index];
      const lesson = await this.insertLesson(topic.id, entry.title, entry.description, entry.estimatedMinutes || 10, index);
      const items = [
        ...entry.vocabularyIds.map((id, itemIndex) => ({ LessonId: lesson.id, VocabularyId: id, KanjiId: null, SourceFolderId: null, OrderIndex: itemIndex })),
        ...entry.kanjiIds.map((id, itemIndex) => ({ LessonId: lesson.id, VocabularyId: null, KanjiId: id, SourceFolderId: null, OrderIndex: entry.vocabularyIds.length + itemIndex })),
      ];
      if (items.length) {
        const { error } = await supabase.from('LessonItems').insert(items);
        if (error) throw error;
      }
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
