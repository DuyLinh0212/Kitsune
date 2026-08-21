// Kitsune.Web/Kitsune.Web.User/src/app/core/models/topic.model.ts
export interface TopicSummary {
  id: number;
  title: string;
  description: string;
  imageUrl: string | null;
  jlptLevel: number | null;
  lessonCount: number;
  completedLessonCount: number;
  progressPercent: number;
}

export interface LessonSummary {
  id: number;
  topicId: number;
  title: string;
  description: string;
  orderIndex: number;
  estimatedMinutes: number;
  itemCount: number;
  completedItemCount: number;
  progressPercent: number;
}

export interface LessonItem {
  id: number;
  lessonId: number;
  vocabularyId: number | null;
  kanjiId: number | null;
  orderIndex: number;
  word: string;
  pronunciation: string | null;
  amHanViet: string | null;
  onyomi: string | null;
  kunyomi: string | null;
  meaning: string;
  exampleSentence: string | null;
  exampleTranslation: string | null;
}

export interface LessonDetail extends LessonSummary {
  topicTitle: string;
  items: LessonItem[];
}

export type MinigameType = 'BUBBLE_POP' | 'KANA_PATH' | 'MEMORY_MATCH' | 'LISTENING';

export interface GameVocabulary {
  id: number;
  word: string;
  pronunciation: string;
  meaning: string;
}
