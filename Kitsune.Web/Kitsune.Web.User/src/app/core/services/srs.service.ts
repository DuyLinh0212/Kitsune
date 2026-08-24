import { Injectable } from '@angular/core';
import { from, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { supabase } from '../supabase/supabase.client';

export type SrsItemType = 'vocabulary' | 'kanji';
export type SrsMode =
  | 'MEAN_FROM_WORD'
  | 'WORD_FROM_MEAN'
  | 'FILL_BLANK'
  | 'ON_KUN_READ'
  | 'ON_READ'
  | 'KUN_READ'
  | 'HAN_VIET'
  | 'COMPOSE_KANJI'
  | 'KANJI_IN_CONTEXT'
  | 'WORD_FROM_HIRAGANA'
  | 'DRAW_KANJI';

export interface SrsVocabularyExample {
  word: string;
  pronunciation: string | null;
  meaning: string;
}

export interface SRSCardDto {
  id: number;
  userId: number;
  folderId: number;
  type: SrsItemType;
  vocabularyId: number | null;
  kanjiId: number | null;
  word: string;
  pronunciation: string | null;
  meaning: string;
  character: string | null;
  amHanViet: string | null;
  onyomi: string | null;
  kunyomi: string | null;
  examples: SrsVocabularyExample[];
  strokeCount: number | null;
  radicalCharacter: string | null;
  radicalName: string | null;
  exampleSentence: string | null;
  exampleTranslation: string | null;
  boxLevel: number;
  easeFactor: number;
  repetitions: number;
  wrongReviewCount: number;
  nextReviewDate: string;
  isDue: boolean;
  isNew: boolean;
}

export interface SrsCardProgressUpdate {
  cardId: number;
  boxLevel: number;
  intervalDays: number;
  nextReviewDate: string;
  wrongReviewCountDelta: number;
}

export interface FolderSrsOverview {
  folderId: number;
  folderName: string;
  totalCards: number;
  newCards: number;
  dueCards: number;
  learnedCards: number;
  masteredCards: number;
  todayNewLearned: number;
  nextDueAt: string | null;
}

export interface FolderSrsSession {
  folderId: number;
  folderName: string;
  overview: FolderSrsOverview;
  cards: SRSCardDto[];
  flashcards: SRSCardDto[];
  quizCards: SRSCardDto[];
}

export interface BoxLevelStat {
  boxLevel: number;
  count: number;
}

export interface MostWrongItem {
  cardId: number;
  type: SrsItemType;
  word: string;
  meaning: string;
  wrongCount: number;
}

export interface AccuracyPoint {
  date: string;
  correct: number;
  total: number;
}

export interface SrsStatsOverview {
  totalReviews: number;
  correctReviews: number;
  accuracyRate: number;
  boxLevels: BoxLevelStat[];
  mostWrong: MostWrongItem[];
  accuracyTrend: AccuracyPoint[];
}

interface DbCardRow {
  Id: number;
  UserId: number;
  VocabularyId: number | null;
  KanjiId: number | null;
  BoxLevel: number | null;
  EaseFactor: number | null;
  IntervalDays: number | null;
  Repetitions: number | null;
  NextReviewDate: string | null;
  LastReviewedAt: string | null;
}

interface FolderRow {
  Id: number;
  FolderName: string;
}

interface VocabRow {
  Id: number;
  Word: string;
  Pronunciation: string | null;
  Meaning: string | null;
  FolderId: number;
  SpecificData: Record<string, unknown> | null;
}

interface KanjiRow {
  Id: number;
  Character: string;
  AmHanViet: string;
  Meaning: string;
  StrokeCount: number;
  Onyomi: string | null;
  Kunyomi: string | null;
  Radical: {
    RadicalCharacter: string;
    RadicalName: string;
  } | null;
}

interface KanjiComponentRow {
  VocabularyId: number;
  KanjiId: number;
  Kanji: KanjiRow;
}

interface KanjiExampleRow {
  KanjiId: number;
  VocabularyId: number;
  Vocabulary: VocabRow | null;
}

interface LessonSrsItemRow {
  Id: number;
  LessonId: number;
  VocabularyId: number | null;
  KanjiId: number | null;
  ExampleSentence: string | null;
  ExampleTranslation: string | null;
}

interface LessonSrsRow {
  Id: number;
  Title: string;
}

interface LessonProgressRow {
  CompletedItemCount: number;
}

const ACTIVE_FOLDER_STORAGE_KEY = 'kitsune.srs.activeFolderId';
const ACTIVE_LESSON_STORAGE_KEY = 'kitsune.srs.activeLessonId';
const GLOBAL_SRS_ID = 0;
const GLOBAL_SRS_NAME = 'SRS chung';
const DAILY_GOAL_STORAGE_PREFIX = 'kitsune.srs.dailyGoal.';
const DAILY_LEARNED_STORAGE_PREFIX = 'kitsune.srs.learnedCards.';
const LESSON_SESSION_CACHE_PREFIX = 'kitsune.srs.lessonSession.';
const LESSON_SESSION_CACHE_VERSION = 1;
const BOX_LEVEL_INTERVALS_MS: Record<number, number> = {
  0: 0,
  1: 30 * 60 * 1000,
  2: 8 * 60 * 60 * 1000,
  3: 2 * 24 * 60 * 60 * 1000,
  4: 5 * 24 * 60 * 60 * 1000,
  5: 10 * 24 * 60 * 60 * 1000,
  6: 21 * 24 * 60 * 60 * 1000,
  7: 60 * 24 * 60 * 60 * 1000,
};
@Injectable({ providedIn: 'root' })
export class SrsService {
  getDailyGoal(): number | null {
    if (typeof window === 'undefined') return null;
    const raw = window.localStorage.getItem(`${DAILY_GOAL_STORAGE_PREFIX}${this.localDateKey()}`);
    const parsed = raw ? Number(raw) : NaN;
    return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : null;
  }

  setDailyGoal(goal: number): void {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(
      `${DAILY_GOAL_STORAGE_PREFIX}${this.localDateKey()}`,
      String(Math.max(1, Math.floor(goal))),
    );
  }

  getActiveFolderId(): number | null {
    if (typeof window === 'undefined') return null;
    const raw = window.localStorage.getItem(ACTIVE_FOLDER_STORAGE_KEY);
    const parsed = raw ? Number(raw) : NaN;
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }

  setActiveFolderId(folderId: number | null): void {
    if (typeof window === 'undefined') return;
    if (folderId == null) {
      window.localStorage.removeItem(ACTIVE_FOLDER_STORAGE_KEY);
      return;
    }
    window.localStorage.setItem(ACTIVE_FOLDER_STORAGE_KEY, String(folderId));
  }

  getActiveLessonId(): number | null {
    if (typeof window === 'undefined') return null;
    const raw = window.localStorage.getItem(ACTIVE_LESSON_STORAGE_KEY);
    const parsed = raw ? Number(raw) : NaN;
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }

  setActiveLessonId(lessonId: number | null): void {
    if (typeof window === 'undefined') return;
    if (lessonId == null) {
      window.localStorage.removeItem(ACTIVE_LESSON_STORAGE_KEY);
      return;
    }
    window.localStorage.setItem(ACTIVE_LESSON_STORAGE_KEY, String(lessonId));
  }

  getLessonOverview(lessonId: number): Observable<FolderSrsOverview> {
    return from(this.loadLessonSession(lessonId)).pipe(
      map((session) => {
        if (!session) throw new Error('Không tìm thấy lượt ôn tập cho bài học này.');
        return session.overview;
      }),
    );
  }

  getLessonSession(lessonId?: number): Observable<FolderSrsSession | null> {
    return from(this.loadLessonSession(lessonId ?? this.getActiveLessonId() ?? undefined));
  }

  getGlobalSession(): Observable<FolderSrsSession | null> {
    return from(this.loadGlobalSession());
  }

  getLessonOverviews(
    lessons: ReadonlyArray<{ id: number; title: string }>,
  ): Observable<FolderSrsOverview[]> {
    return from(this.loadLessonOverviews(lessons));
  }

  async getCachedLessonSession(): Promise<FolderSrsSession | null> {
    if (typeof window === 'undefined') return null;
    const cacheKey = await this.getLessonSessionCacheKey();
    if (!cacheKey) return null;
    try {
      const raw = window.localStorage.getItem(cacheKey);
      if (!raw) return null;
      const payload = JSON.parse(raw) as { version?: unknown; session?: unknown };
      if (payload.version !== LESSON_SESSION_CACHE_VERSION || !payload.session) return null;
      return payload.session as FolderSrsSession;
    } catch {
      return null;
    }
  }

  async cacheLessonSession(session: FolderSrsSession): Promise<void> {
    if (typeof window === 'undefined') return;
    const cacheKey = await this.getLessonSessionCacheKey();
    if (!cacheKey) return;
    try {
      window.localStorage.setItem(
        cacheKey,
        JSON.stringify({
          version: LESSON_SESSION_CACHE_VERSION,
          savedAt: new Date().toISOString(),
          session,
        }),
      );
    } catch {
      // Local cache is an enhancement; a storage failure must not block review.
    }
  }

  getFolderOverview(folderId: number): Observable<FolderSrsOverview> {
    return from(this.loadFolderSession(folderId)).pipe(
      map((session) => {
        if (!session) {
          throw new Error('Không tìm thấy session SRS cho folder này.');
        }
        return session.overview;
      }),
    );
  }

  getFolderSession(folderId?: number): Observable<FolderSrsSession | null> {
    return from(this.loadFolderSession(folderId ?? undefined));
  }

  getDueCards(folderId?: number): Observable<SRSCardDto[]> {
    return from(this.loadFolderSession(folderId ?? undefined)).pipe(
      map((session) => session?.cards ?? []),
    );
  }

  activateFolder(folderId: number): Observable<FolderSrsSession> {
    return from(this.activateFolderNow(folderId));
  }

  completeFlashcard(card: SRSCardDto): Observable<SrsCardProgressUpdate> {
    return from(this.updateCardProgress(card, true, true));
  }

  submitQuizAnswer(card: SRSCardDto, correct: boolean): Observable<SrsCardProgressUpdate> {
    return from(this.updateCardProgress(card, correct, false));
  }

  previewCardProgress(
    card: SRSCardDto,
    correct: boolean,
    flashcard: boolean,
  ): SrsCardProgressUpdate {
    const currentLevel = this.normalizeLevel(card.boxLevel);
    const nextLevel = flashcard ? 1 : this.resolveNextLevel(currentLevel, correct);
    return {
      cardId: card.id,
      boxLevel: nextLevel,
      intervalDays: this.intervalDays(nextLevel),
      nextReviewDate: this.computeNextReviewDate(nextLevel, Date.now()),
      wrongReviewCountDelta: correct || flashcard ? 0 : 1,
    };
  }

  getStatsOverview(): Observable<SrsStatsOverview> {
    return from(this.loadStatsOverview());
  }

  async ensureFolderCards(folderId: number): Promise<void> {
    const { data: authData } = await supabase.auth.getUser();
    const email = authData.user?.email;
    if (!email) throw new Error('Not authenticated');

    const userId = await this.getCurrentUserId(email);
    const context = await this.loadFolderContext(folderId, userId);
    await this.insertMissingCards(context);
  }

  private async loadFolderSession(folderId?: number): Promise<FolderSrsSession | null> {
    const resolvedFolderId = folderId ?? this.getActiveFolderId();
    if (!resolvedFolderId) return null;

    const { data: authData } = await supabase.auth.getUser();
    const email = authData.user?.email;
    if (!email) return null;

    const userId = await this.getCurrentUserId(email);
    let context = await this.loadFolderContext(resolvedFolderId, userId);
    const insertedCards = await this.insertMissingCards(context);
    if (insertedCards) {
      context = await this.loadFolderContext(resolvedFolderId, userId);
    }
    const cards = this.mapCards(context);
    const overview = this.buildOverview(context.folder, cards, context.todayNewLearned);
    const flashcards = cards.filter((card) => card.boxLevel === 0);
    const quizCards = cards.filter((card) =>
      this.isScheduledReviewDue(card.boxLevel, card.nextReviewDate),
    );

    return {
      folderId: resolvedFolderId,
      folderName: context.folder.FolderName,
      overview,
      cards: this.sortCards(cards),
      flashcards: this.sortCards(flashcards),
      quizCards: this.sortCards(quizCards),
    };
  }

  private async activateFolderNow(folderId: number): Promise<FolderSrsSession> {
    const session = await this.loadFolderSession(folderId);
    if (!session) {
      throw new Error('Không thể khởi tạo SRS cho folder này.');
    }

    this.setActiveFolderId(folderId);
    return session;
  }

  private async loadGlobalSession(): Promise<FolderSrsSession | null> {
    const { data: authData } = await supabase.auth.getUser();
    const email = authData.user?.email;
    if (!email) return null;
    const userId = await this.getCurrentUserId(email);
    const { data: cardData, error: cardError } = await supabase
      .from('SRSCards')
      .select(
        'Id, UserId, VocabularyId, KanjiId, BoxLevel, EaseFactor, IntervalDays, Repetitions, NextReviewDate, LastReviewedAt',
      )
      .eq('UserId', userId)
      .gt('BoxLevel', 0);
    if (cardError) throw cardError;

    const cards = (cardData ?? []) as DbCardRow[];
    const vocabularyIds = [
      ...new Set(cards.flatMap((card) => (card.VocabularyId == null ? [] : [card.VocabularyId]))),
    ];
    const kanjiIds = [
      ...new Set(cards.flatMap((card) => (card.KanjiId == null ? [] : [card.KanjiId]))),
    ];
    const [{ data: vocabData, error: vocabError }, { data: kanjiData, error: kanjiError }] =
      await Promise.all([
        vocabularyIds.length
          ? supabase
              .from('Vocabularies')
              .select('Id, Word, Pronunciation, Meaning, FolderId, SpecificData')
              .in('Id', vocabularyIds)
          : Promise.resolve({ data: [], error: null }),
        kanjiIds.length
          ? supabase
              .from('Kanji')
              .select(
                'Id, Character, AmHanViet, Meaning, StrokeCount, Onyomi, Kunyomi, Radical:RadicalId(RadicalCharacter, RadicalName)',
              )
              .in('Id', kanjiIds)
          : Promise.resolve({ data: [], error: null }),
      ]);
    if (vocabError) throw vocabError;
    if (kanjiError) throw kanjiError;

    const [wrongReviewCounts, todayNewLearned, kanjiExamples] = await Promise.all([
      this.loadWrongReviewCounts(cards.map((card) => card.Id)),
      this.loadTodayNewLearned(cards.map((card) => card.Id)),
      this.loadKanjiExamples(kanjiIds),
    ]);
    const vocabMap = new Map(
      (vocabData ?? []).map((vocab) => [(vocab as VocabRow).Id, vocab as VocabRow]),
    );
    const kanjiMap = new Map(
      (kanjiData ?? []).map((kanji) => [
        (kanji as unknown as KanjiRow).Id,
        kanji as unknown as KanjiRow,
      ]),
    );
    const mappedCards = cards
      .filter((card) =>
        card.VocabularyId != null
          ? vocabMap.has(card.VocabularyId)
          : card.KanjiId != null && kanjiMap.has(card.KanjiId),
      )
      .map((card) =>
        this.mapRowToCard(
          card,
          vocabMap,
          kanjiMap,
          kanjiExamples,
          wrongReviewCounts,
          GLOBAL_SRS_ID,
          Date.now(),
        ),
      );
    const overview = this.buildOverview(
      { Id: GLOBAL_SRS_ID, FolderName: GLOBAL_SRS_NAME },
      mappedCards,
      todayNewLearned,
    );
    return {
      folderId: GLOBAL_SRS_ID,
      folderName: GLOBAL_SRS_NAME,
      overview,
      cards: this.sortCards(mappedCards),
      flashcards: this.sortCards(mappedCards.filter((card) => card.boxLevel === 0)),
      quizCards: this.sortCards(
        mappedCards.filter((card) => this.isScheduledReviewDue(card.boxLevel, card.nextReviewDate)),
      ),
    };
  }

  private async loadLessonSession(lessonId?: number): Promise<FolderSrsSession | null> {
    if (!lessonId) return null;
    const { data: authData } = await supabase.auth.getUser();
    const email = authData.user?.email;
    if (!email) return null;
    const userId = await this.getCurrentUserId(email);

    const [
      { data: lessonData, error: lessonError },
      { data: itemData, error: itemError },
      { data: progressData, error: progressError },
    ] = await Promise.all([
      supabase.from('Lessons').select('Id, Title').eq('Id', lessonId).single(),
      supabase
        .from('LessonItems')
        .select('Id, LessonId, VocabularyId, KanjiId, ExampleSentence, ExampleTranslation')
        .eq('LessonId', lessonId)
        .order('OrderIndex'),
      supabase
        .from('UserLessonProgress')
        .select('CompletedItemCount')
        .eq('UserId', userId)
        .eq('LessonId', lessonId)
        .maybeSingle(),
    ]);
    if (lessonError) throw lessonError;
    if (itemError) throw itemError;
    if (progressError) throw progressError;
    const lesson = lessonData as LessonSrsRow;
    const items = (itemData ?? []) as LessonSrsItemRow[];
    const completedItemCount = Math.min(
      (progressData as LessonProgressRow | null)?.CompletedItemCount ?? 0,
      items.length,
    );
    const studiedItemIds = new Set(items.slice(0, completedItemCount).map((item) => item.Id));
    const studiedItems = items.filter((item) => studiedItemIds.has(item.Id));
    const vocabularyIds = studiedItems
      .map((item) => item.VocabularyId)
      .filter((id): id is number => id != null);
    const kanjiIds = studiedItems
      .map((item) => item.KanjiId)
      .filter((id): id is number => id != null);

    const [{ data: vocabData, error: vocabError }, { data: kanjiData, error: kanjiError }] =
      await Promise.all([
        vocabularyIds.length
          ? supabase
              .from('Vocabularies')
              .select('Id, Word, Pronunciation, Meaning, FolderId, SpecificData')
              .in('Id', vocabularyIds)
          : Promise.resolve({ data: [], error: null }),
        kanjiIds.length
          ? supabase
              .from('Kanji')
              .select(
                'Id, Character, AmHanViet, Meaning, StrokeCount, Onyomi, Kunyomi, Radical:RadicalId(RadicalCharacter, RadicalName)',
              )
              .in('Id', kanjiIds)
          : Promise.resolve({ data: [], error: null }),
      ]);
    if (vocabError) throw vocabError;
    if (kanjiError) throw kanjiError;
    const vocabs = (vocabData ?? []) as VocabRow[];
    const kanji = (kanjiData ?? []) as unknown as KanjiRow[];

    let cards = await this.loadFolderCards(userId, vocabularyIds, kanjiIds);
    const existingKeys = new Set(
      cards.map((card) => this.cardKey(card.VocabularyId, card.KanjiId)),
    );
    const now = new Date().toISOString();
    const inserts: Record<string, unknown>[] = [];
    for (const item of studiedItems) {
      const key = this.cardKey(item.VocabularyId, item.KanjiId);
      if (existingKeys.has(key)) continue;
      inserts.push({
        UserId: userId,
        VocabularyId: item.VocabularyId,
        KanjiId: item.KanjiId,
        BoxLevel: studiedItemIds.has(item.Id) ? 1 : 0,
        EaseFactor: 2.5,
        IntervalDays: studiedItemIds.has(item.Id) ? 1 : 0,
        Repetitions: studiedItemIds.has(item.Id) ? 1 : 0,
        NextReviewDate: now,
        LastReviewedAt: studiedItemIds.has(item.Id) ? now : null,
      });
      existingKeys.add(key);
    }
    if (inserts.length) {
      const { error } = await supabase.from('SRSCards').insert(inserts);
      if (error) throw error;
      cards = await this.loadFolderCards(userId, vocabularyIds, kanjiIds);
    }

    const studiedCardIds = items.flatMap((item) => {
      if (!studiedItemIds.has(item.Id)) return [];
      const card = cards.find(
        (entry) =>
          this.cardKey(entry.VocabularyId, entry.KanjiId) ===
          this.cardKey(item.VocabularyId, item.KanjiId),
      );
      return card && this.normalizeLevel(card.BoxLevel) === 0 ? [card.Id] : [];
    });
    if (studiedCardIds.length) {
      const { error } = await supabase
        .from('SRSCards')
        .update({
          BoxLevel: 1,
          EaseFactor: 2.5,
          IntervalDays: 1,
          Repetitions: 1,
          NextReviewDate: now,
          LastReviewedAt: now,
        })
        .in('Id', studiedCardIds)
        .eq('UserId', userId);
      if (error) throw error;
      cards = await this.loadFolderCards(userId, vocabularyIds, kanjiIds);
    }

    const cardByKey = new Map(
      cards.map((card) => [this.cardKey(card.VocabularyId, card.KanjiId), card]),
    );
    const links = studiedItems.flatMap((item) => {
      const card = cardByKey.get(this.cardKey(item.VocabularyId, item.KanjiId));
      return card ? [{ UserId: userId, CardId: card.Id, LessonItemId: item.Id }] : [];
    });
    if (links.length) {
      const { error } = await supabase
        .from('SrsCardLessons')
        .upsert(links, { onConflict: 'UserId,LessonItemId' });
      if (error) throw error;
    }

    const cardIds = cards.map((card) => card.Id);
    const [wrongReviewCounts, todayNewLearned, kanjiExamples] = await Promise.all([
      this.loadWrongReviewCounts(cardIds),
      this.loadTodayNewLearned(cardIds),
      this.loadKanjiExamples(kanjiIds),
    ]);
    const vocabMap = new Map(vocabs.map((vocab) => [vocab.Id, vocab]));
    const kanjiMap = new Map(kanji.map((entry) => [entry.Id, entry]));
    const nowMs = Date.now();
    const itemByKey = new Map(
      studiedItems.map((item) => [this.cardKey(item.VocabularyId, item.KanjiId), item]),
    );
    const mapped = cards
      .filter(
        (card) =>
          (card.VocabularyId != null && vocabularyIds.includes(card.VocabularyId)) ||
          (card.KanjiId != null && kanjiIds.includes(card.KanjiId)),
      )
      .map((card) => {
        const mappedCard = this.mapRowToCard(
          card,
          vocabMap,
          kanjiMap,
          kanjiExamples,
          wrongReviewCounts,
          lessonId,
          nowMs,
        );
        const lessonItem = itemByKey.get(this.cardKey(card.VocabularyId, card.KanjiId));
        return {
          ...mappedCard,
          exampleSentence: lessonItem?.ExampleSentence ?? null,
          exampleTranslation: lessonItem?.ExampleTranslation ?? null,
        };
      });
    const overview = this.buildOverview(
      { Id: lesson.Id, FolderName: lesson.Title },
      mapped,
      todayNewLearned,
    );
    const session: FolderSrsSession = {
      folderId: lesson.Id,
      folderName: lesson.Title,
      overview,
      cards: this.sortCards(mapped),
      flashcards: this.sortCards(mapped.filter((card) => card.boxLevel === 0)),
      quizCards: this.sortCards(
        mapped.filter((card) => this.isScheduledReviewDue(card.boxLevel, card.nextReviewDate)),
      ),
    };
    void this.cacheLessonSession(session);
    return session;
  }

  private async loadLessonOverviews(
    lessons: ReadonlyArray<{ id: number; title: string }>,
  ): Promise<FolderSrsOverview[]> {
    if (lessons.length === 0) return [];
    const { data: authData } = await supabase.auth.getUser();
    const email = authData.user?.email;
    if (!email) return [];
    const userId = await this.getCurrentUserId(email);
    const lessonIds = lessons.map((lesson) => lesson.id);
    const { data: itemData, error: itemError } = await supabase
      .from('LessonItems')
      .select('LessonId, VocabularyId, KanjiId')
      .in('LessonId', lessonIds);
    if (itemError) throw itemError;

    const items = (itemData ?? []) as Pick<
      LessonSrsItemRow,
      'LessonId' | 'VocabularyId' | 'KanjiId'
    >[];
    const vocabularyIds = [
      ...new Set(items.flatMap((item) => (item.VocabularyId == null ? [] : [item.VocabularyId]))),
    ];
    const kanjiIds = [
      ...new Set(items.flatMap((item) => (item.KanjiId == null ? [] : [item.KanjiId]))),
    ];
    const cards = await this.loadFolderCards(userId, vocabularyIds, kanjiIds);
    const learnedToday = await this.loadTodayNewLearnedCardIds(cards.map((card) => card.Id));
    const cardsByKey = new Map(
      cards.map((card) => [this.cardKey(card.VocabularyId, card.KanjiId), card]),
    );
    const itemsByLesson = new Map<number, typeof items>();
    for (const item of items) {
      const current = itemsByLesson.get(item.LessonId) ?? [];
      current.push(item);
      itemsByLesson.set(item.LessonId, current);
    }

    return lessons.map((lesson) => {
      const lessonItems = itemsByLesson.get(lesson.id) ?? [];
      const lessonCards = lessonItems
        .map((item) => cardsByKey.get(this.cardKey(item.VocabularyId, item.KanjiId)))
        .filter((card): card is DbCardRow => !!card);
      const learnedCards = lessonCards.filter((card) => this.normalizeLevel(card.BoxLevel) > 0);
      const futureDates = lessonCards
        .filter((card) => {
          const level = this.normalizeLevel(card.BoxLevel);
          return level > 0 && !this.isScheduledReviewDue(level, card.NextReviewDate ?? '');
        })
        .map((card) => card.NextReviewDate ?? '')
        .filter(Boolean)
        .sort();
      return {
        folderId: lesson.id,
        folderName: lesson.title,
        totalCards: lessonItems.length,
        newCards: lessonItems.length - learnedCards.length,
        dueCards: lessonCards.filter((card) =>
          this.isScheduledReviewDue(this.normalizeLevel(card.BoxLevel), card.NextReviewDate ?? ''),
        ).length,
        learnedCards: learnedCards.length,
        masteredCards: lessonCards.filter((card) => this.normalizeLevel(card.BoxLevel) >= 7).length,
        todayNewLearned: lessonCards.filter((card) => learnedToday.has(card.Id)).length,
        nextDueAt: futureDates[0] ?? null,
      } satisfies FolderSrsOverview;
    });
  }

  private async updateCardProgress(
    card: SRSCardDto,
    correct: boolean,
    flashcard: boolean,
  ): Promise<SrsCardProgressUpdate> {
    const currentLevel = this.normalizeLevel(card.boxLevel);
    const nextLevel = flashcard ? 1 : this.resolveNextLevel(currentLevel, correct);
    const reviewedAt = new Date();
    const nextReviewDate = this.computeNextReviewDate(nextLevel, reviewedAt.getTime());

    const patch: Record<string, unknown> = {
      BoxLevel: nextLevel,
      EaseFactor: 2.5,
      IntervalDays: this.intervalDays(nextLevel),
      Repetitions: this.resolveRepetitions(currentLevel, nextLevel, correct, card.repetitions),
      NextReviewDate: nextReviewDate,
      LastReviewedAt: reviewedAt.toISOString(),
    };

    const { error: updateError } = await supabase
      .from('SRSCards')
      .update(patch)
      .eq('Id', card.id)
      .eq('UserId', card.userId);
    if (updateError) throw updateError;

    const rating = flashcard ? 3 : correct ? 3 : 1;
    const { error: logError } = await supabase.from('SRSReviewLogs').insert({
      CardId: card.id,
      Rating: rating,
      OldBoxLevel: currentLevel,
      NewBoxLevel: nextLevel,
      OldEaseFactor: card.easeFactor,
      NewEaseFactor: 2.5,
      ReviewedAt: reviewedAt.toISOString(),
    });
    if (logError) console.warn('Không thể ghi log ôn tập SRS:', logError.message);
    if (flashcard) this.recordLocalNewCard(card.id);

    return {
      cardId: card.id,
      boxLevel: nextLevel,
      intervalDays: this.intervalDays(nextLevel),
      nextReviewDate,
      wrongReviewCountDelta: correct || flashcard ? 0 : 1,
    };
  }

  private async loadFolderContext(
    folderId: number,
    userId: number,
  ): Promise<{
    folderId: number;
    userId: number;
    folder: FolderRow;
    vocabs: VocabRow[];
    kanjiComponents: KanjiComponentRow[];
    kanjiExamples: Map<number, SrsVocabularyExample[]>;
    todayNewLearned: number;
    wrongReviewCounts: Map<number, number>;
    cards: DbCardRow[];
  }> {
    const [{ data: folderData, error: folderError }, { data: vocabData, error: vocabError }] =
      await Promise.all([
        supabase.from('VocabularyFolder').select('Id, FolderName').eq('Id', folderId).single(),
        supabase
          .from('Vocabularies')
          .select('Id, Word, Pronunciation, Meaning, FolderId, SpecificData')
          .eq('FolderId', folderId)
          .order('CreatedAt', { ascending: true }),
      ]);

    if (folderError) throw folderError;
    if (vocabError) throw vocabError;

    const allVocabs = (vocabData ?? []) as VocabRow[];
    const vocabIds = allVocabs.map((v) => v.Id);

    const kanjiComponents = vocabIds.length === 0 ? [] : await this.loadKanjiComponents(vocabIds);

    const componentsByVocabulary = new Map<number, KanjiComponentRow[]>();
    for (const component of kanjiComponents) {
      const current = componentsByVocabulary.get(component.VocabularyId) ?? [];
      current.push(component);
      componentsByVocabulary.set(component.VocabularyId, current);
    }
    const vocabs = allVocabs.filter(
      (vocab) => !this.isKanjiOnlyVocabulary(vocab, componentsByVocabulary.get(vocab.Id) ?? []),
    );

    const kanjiIds = this.uniqueKanji(kanjiComponents).map((kanji) => kanji.Id);
    const visibleVocabIds = new Set(vocabs.map((vocab) => vocab.Id));
    const visibleKanjiIds = new Set(kanjiIds);
    const allCards = await this.loadFolderCards(userId, [...visibleVocabIds], [...visibleKanjiIds]);
    const folderCardIds = allCards
      .filter((card) =>
        card.VocabularyId != null
          ? visibleVocabIds.has(card.VocabularyId)
          : card.KanjiId != null && visibleKanjiIds.has(card.KanjiId),
      )
      .map((card) => card.Id);
    const [kanjiExamples, todayNewLearned, wrongReviewCounts] = await Promise.all([
      this.loadKanjiExamples(kanjiIds),
      this.loadTodayNewLearned(folderCardIds),
      this.loadWrongReviewCounts(folderCardIds),
    ]);

    return {
      folderId,
      userId,
      folder: folderData as FolderRow,
      vocabs,
      kanjiComponents,
      kanjiExamples,
      todayNewLearned,
      wrongReviewCounts,
      cards: allCards,
    };
  }

  private async loadFolderCards(
    userId: number,
    vocabularyIds: number[],
    kanjiIds: number[],
  ): Promise<DbCardRow[]> {
    if (vocabularyIds.length === 0 && kanjiIds.length === 0) return [];

    let query = supabase
      .from('SRSCards')
      .select(
        'Id, UserId, VocabularyId, KanjiId, BoxLevel, EaseFactor, IntervalDays, Repetitions, NextReviewDate, LastReviewedAt',
      )
      .eq('UserId', userId);

    if (vocabularyIds.length > 0 && kanjiIds.length > 0) {
      query = query.or(
        `VocabularyId.in.(${vocabularyIds.join(',')}),KanjiId.in.(${kanjiIds.join(',')})`,
      );
    } else if (vocabularyIds.length > 0) {
      query = query.in('VocabularyId', vocabularyIds);
    } else {
      query = query.in('KanjiId', kanjiIds);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []) as DbCardRow[];
  }

  private async loadWrongReviewCounts(cardIds: number[]): Promise<Map<number, number>> {
    const counts = new Map<number, number>();
    if (cardIds.length === 0) return counts;

    const { data, error } = await supabase
      .from('SRSReviewLogs')
      .select('CardId, Rating, OldBoxLevel, NewBoxLevel')
      .in('CardId', cardIds);

    if (error) {
      console.warn('Không thể tải lịch sử sai SRS:', error.message);
      return counts;
    }

    for (const log of data ?? []) {
      const row = log as {
        CardId: number;
        Rating: number;
        OldBoxLevel: number;
        NewBoxLevel: number;
      };
      if (row.Rating <= 2 || row.NewBoxLevel < row.OldBoxLevel) {
        counts.set(row.CardId, (counts.get(row.CardId) ?? 0) + 1);
      }
    }

    return counts;
  }

  private async loadKanjiExamples(
    kanjiIds: number[],
  ): Promise<Map<number, SrsVocabularyExample[]>> {
    const examples = new Map<number, SrsVocabularyExample[]>();
    if (kanjiIds.length === 0) return examples;

    const { data, error } = await supabase
      .from('KanjiComponents')
      .select(
        'KanjiId, VocabularyId, Vocabulary:VocabularyId(Id, Word, Pronunciation, Meaning, FolderId, SpecificData)',
      )
      .in('KanjiId', kanjiIds)
      .order('VocabularyId', { ascending: true });

    if (error) throw error;
    for (const raw of (data ?? []) as unknown[]) {
      const row = raw as KanjiExampleRow;
      const vocabulary = row.Vocabulary;
      if (!vocabulary || this.isKanjiOnlyVocabulary(vocabulary)) continue;
      const current = examples.get(row.KanjiId) ?? [];
      if (current.length >= 3 || current.some((item) => item.word === vocabulary.Word)) continue;
      current.push({
        word: vocabulary.Word,
        pronunciation: vocabulary.Pronunciation,
        meaning: vocabulary.Meaning ?? '',
      });
      examples.set(row.KanjiId, current);
    }
    return examples;
  }

  private async loadTodayNewLearned(cardIds: number[]): Promise<number> {
    const localCount = this.getLocalNewCardIds().size;
    if (cardIds.length === 0) return localCount;
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    const { data, error } = await supabase
      .from('SRSReviewLogs')
      .select('CardId')
      .in('CardId', cardIds)
      .eq('OldBoxLevel', 0)
      .gte('ReviewedAt', start.toISOString())
      .lt('ReviewedAt', end.toISOString());

    if (error) {
      console.warn('Không thể tải tiến độ từ mới hôm nay:', error.message);
      return localCount;
    }
    const databaseCount = new Set((data ?? []).map((row) => row.CardId as number)).size;
    return Math.max(databaseCount, localCount);
  }

  private async loadTodayNewLearnedCardIds(cardIds: number[]): Promise<Set<number>> {
    const localIds = this.getLocalNewCardIds();
    if (cardIds.length === 0) return localIds;
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    const { data, error } = await supabase
      .from('SRSReviewLogs')
      .select('CardId')
      .in('CardId', cardIds)
      .eq('OldBoxLevel', 0)
      .gte('ReviewedAt', start.toISOString())
      .lt('ReviewedAt', end.toISOString());
    if (error) return localIds;
    return new Set([...localIds, ...(data ?? []).map((row) => (row as { CardId: number }).CardId)]);
  }

  private async loadKanjiComponents(vocabIds: number[]): Promise<KanjiComponentRow[]> {
    const { data, error } = await supabase
      .from('KanjiComponents')
      .select(
        `
        VocabularyId,
        KanjiId,
        "Order",
        Kanji:KanjiId(
          Id, Character, AmHanViet, Meaning, StrokeCount, Onyomi, Kunyomi,
          Radical:RadicalId(RadicalCharacter, RadicalName)
        )
      `,
      )
      .in('VocabularyId', vocabIds)
      .order('Order', { ascending: true });

    if (error) throw error;
    return ((data ?? []) as unknown[]).map((row) => {
      const raw = row as Record<string, unknown>;
      return {
        VocabularyId: raw['VocabularyId'] as number,
        KanjiId: raw['KanjiId'] as number,
        Kanji: raw['Kanji'] as KanjiRow,
      };
    });
  }

  private async insertMissingCards(
    context: Awaited<ReturnType<SrsService['loadFolderContext']>>,
  ): Promise<boolean> {
    const existingKeys = new Set<string>();
    for (const row of context.cards) {
      existingKeys.add(this.cardKey(row.VocabularyId, row.KanjiId));
    }

    const inserts: Record<string, unknown>[] = [];
    const now = new Date().toISOString();

    for (const vocab of context.vocabs) {
      const key = this.cardKey(vocab.Id, null);
      if (existingKeys.has(key)) continue;
      inserts.push({
        UserId: context.userId,
        VocabularyId: vocab.Id,
        KanjiId: null,
        BoxLevel: 0,
        EaseFactor: 2.5,
        IntervalDays: 0,
        Repetitions: 0,
        NextReviewDate: now,
      });
      existingKeys.add(key);
    }

    const uniqueKanji = this.uniqueKanji(context.kanjiComponents);
    for (const kanji of uniqueKanji) {
      const key = this.cardKey(null, kanji.Id);
      if (existingKeys.has(key)) continue;
      inserts.push({
        UserId: context.userId,
        VocabularyId: null,
        KanjiId: kanji.Id,
        BoxLevel: 0,
        EaseFactor: 2.5,
        IntervalDays: 0,
        Repetitions: 0,
        NextReviewDate: now,
      });
      existingKeys.add(key);
    }

    if (inserts.length === 0) return false;

    const { error } = await supabase.from('SRSCards').insert(inserts);
    if (error) throw error;
    return true;
  }

  private mapCards(context: Awaited<ReturnType<SrsService['loadFolderContext']>>): SRSCardDto[] {
    const vocabMap = new Map(context.vocabs.map((v) => [v.Id, v]));
    const kanjiMap = new Map<number, KanjiRow>();
    for (const item of this.uniqueKanji(context.kanjiComponents)) {
      kanjiMap.set(item.Id, item);
    }

    const now = Date.now();
    const rows = context.cards.filter((row) => this.belongsToFolder(row, vocabMap, kanjiMap));

    return rows
      .map((row) =>
        this.mapRowToCard(
          row,
          vocabMap,
          kanjiMap,
          context.kanjiExamples,
          context.wrongReviewCounts,
          context.folderId,
          now,
        ),
      )
      .sort((a, b) => this.sortValue(a) - this.sortValue(b));
  }

  private mapRowToCard(
    row: DbCardRow,
    vocabMap: Map<number, VocabRow>,
    kanjiMap: Map<number, KanjiRow>,
    kanjiExamples: Map<number, SrsVocabularyExample[]>,
    wrongReviewCounts: Map<number, number>,
    folderId: number,
    now: number,
  ): SRSCardDto {
    const vocab = row.VocabularyId != null ? vocabMap.get(row.VocabularyId) : null;
    const kanji = row.KanjiId != null ? kanjiMap.get(row.KanjiId) : null;
    const boxLevel = this.normalizeLevel(row.BoxLevel);
    const nextReviewDate = this.effectiveNextReviewDate(row, boxLevel, now);
    const isDue = boxLevel === 0 || this.isScheduledReviewDue(boxLevel, nextReviewDate, now);

    return {
      id: row.Id,
      userId: row.UserId,
      folderId,
      type: row.KanjiId != null ? 'kanji' : 'vocabulary',
      vocabularyId: row.VocabularyId,
      kanjiId: row.KanjiId,
      word: kanji?.Character ?? vocab?.Word ?? '',
      pronunciation: kanji ? null : (vocab?.Pronunciation ?? null),
      meaning: kanji?.Meaning ?? vocab?.Meaning ?? '',
      character: kanji?.Character ?? null,
      amHanViet: kanji?.AmHanViet ?? null,
      onyomi: kanji?.Onyomi ?? null,
      kunyomi: kanji?.Kunyomi ?? null,
      examples: row.KanjiId != null ? (kanjiExamples.get(row.KanjiId) ?? []) : [],
      strokeCount: kanji?.StrokeCount ?? null,
      radicalCharacter: kanji?.Radical?.RadicalCharacter ?? null,
      radicalName: kanji?.Radical?.RadicalName ?? null,
      exampleSentence: null,
      exampleTranslation: null,
      boxLevel,
      easeFactor: row.EaseFactor ?? 2.5,
      repetitions: row.Repetitions ?? 0,
      wrongReviewCount: wrongReviewCounts.get(row.Id) ?? 0,
      nextReviewDate,
      isDue,
      isNew: boxLevel === 0,
    };
  }

  private buildOverview(
    folder: FolderRow,
    cards: SRSCardDto[],
    todayNewLearned: number,
  ): FolderSrsOverview {
    const totalCards = cards.length;
    const newCards = cards.filter((card) => card.boxLevel === 0).length;
    const dueCards = cards.filter((card) =>
      this.isScheduledReviewDue(card.boxLevel, card.nextReviewDate),
    ).length;
    const learnedCards = totalCards - newCards;
    const masteredCards = cards.filter((card) => card.boxLevel >= 7).length;
    const nextDueAt = this.findNextDue(cards);

    return {
      folderId: folder.Id,
      folderName: folder.FolderName,
      totalCards,
      newCards,
      dueCards,
      learnedCards,
      masteredCards,
      todayNewLearned,
      nextDueAt,
    };
  }

  private findNextDue(cards: SRSCardDto[]): string | null {
    const future = cards
      .filter(
        (card) =>
          card.boxLevel > 0 &&
          !this.isScheduledReviewDue(card.boxLevel, card.nextReviewDate) &&
          card.nextReviewDate,
      )
      .sort((a, b) => new Date(a.nextReviewDate).getTime() - new Date(b.nextReviewDate).getTime());
    return future[0]?.nextReviewDate ?? null;
  }

  private sortCards(cards: SRSCardDto[]): SRSCardDto[] {
    return [...cards].sort((a, b) => this.sortValue(a) - this.sortValue(b));
  }

  private sortValue(card: SRSCardDto): number {
    const levelBias = card.boxLevel === 0 ? 0 : 1000 + card.boxLevel * 100;
    const dueBias = new Date(card.nextReviewDate).getTime() / 1000000;
    return levelBias + dueBias;
  }

  private isScheduledReviewDue(
    boxLevel: number,
    nextReviewDate: string,
    now = Date.now(),
  ): boolean {
    if (boxLevel <= 0) return false;
    const dueAt = Date.parse(nextReviewDate);
    return Number.isFinite(dueAt) && dueAt <= now;
  }

  private belongsToFolder(
    row: DbCardRow,
    vocabMap: Map<number, VocabRow>,
    kanjiMap: Map<number, KanjiRow>,
  ): boolean {
    if (row.VocabularyId != null) return vocabMap.has(row.VocabularyId);
    if (row.KanjiId != null) return kanjiMap.has(row.KanjiId);
    return false;
  }

  private uniqueKanji(rows: KanjiComponentRow[]): KanjiRow[] {
    const map = new Map<number, KanjiRow>();
    for (const row of rows) {
      map.set(row.KanjiId, row.Kanji);
    }
    return [...map.values()];
  }

  private isKanjiOnlyVocabulary(
    vocab: Pick<VocabRow, 'Word' | 'SpecificData'>,
    components: KanjiComponentRow[] = [],
  ): boolean {
    const itemType = vocab.SpecificData?.['_kitsuneItemType'];
    if (itemType === 'kanji') return true;
    if (itemType === 'vocabulary' || vocab.SpecificData) return false;

    return (
      vocab.Word.trim().length === 1 &&
      components.length === 1 &&
      components[0].Kanji.Character === vocab.Word.trim()
    );
  }

  private cardKey(vocabularyId: number | null, kanjiId: number | null): string {
    return `${vocabularyId ?? 'v'}:${kanjiId ?? 'k'}`;
  }

  private localDateKey(): string {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${now.getFullYear()}-${month}-${day}`;
  }

  private recordLocalNewCard(cardId: number): void {
    if (typeof window === 'undefined') return;
    const ids = this.getLocalNewCardIds();
    ids.add(cardId);
    window.localStorage.setItem(
      `${DAILY_LEARNED_STORAGE_PREFIX}${this.localDateKey()}`,
      JSON.stringify([...ids]),
    );
  }

  private getLocalNewCardIds(): Set<number> {
    if (typeof window === 'undefined') return new Set<number>();
    const raw = window.localStorage.getItem(
      `${DAILY_LEARNED_STORAGE_PREFIX}${this.localDateKey()}`,
    );
    if (!raw) return new Set<number>();
    try {
      const values = JSON.parse(raw) as unknown[];
      return new Set(values.map(Number).filter((value) => Number.isFinite(value)));
    } catch {
      return new Set<number>();
    }
  }

  private normalizeLevel(level: number | null | undefined): number {
    const value = Number(level ?? 0);
    return Number.isFinite(value) ? Math.max(0, Math.min(7, Math.floor(value))) : 0;
  }

  private resolveNextLevel(currentLevel: number, correct: boolean): number {
    if (correct) {
      return Math.min(currentLevel + 1, 7);
    }

    switch (currentLevel) {
      case 0:
      case 1:
      case 2:
        return 1;
      case 3:
        return 2;
      case 4:
        return 3;
      case 5:
        return 4;
      case 6:
        return 4;
      case 7:
        return 5;
      default:
        return 1;
    }
  }

  private computeNextReviewDate(level: number, fromMs = Date.now()): string {
    const interval = BOX_LEVEL_INTERVALS_MS[level] ?? 0;
    return new Date(fromMs + interval).toISOString();
  }

  private effectiveNextReviewDate(row: DbCardRow, level: number, now: number): string {
    const storedValue = row.NextReviewDate ?? '';
    if (!storedValue || !Number.isFinite(Date.parse(storedValue))) return '';

    // The persisted timestamp is the source of truth. Never make a card due
    // earlier in the client merely because a schedule has since been shortened.
    return storedValue;
  }

  private intervalDays(level: number): number {
    const interval = BOX_LEVEL_INTERVALS_MS[level] ?? 0;
    if (interval <= 0) return 0;
    return Math.max(1, Math.floor(interval / (24 * 60 * 60 * 1000)));
  }

  private resolveRepetitions(
    currentLevel: number,
    nextLevel: number,
    correct: boolean,
    currentRepetitions = 0,
  ): number {
    if (!correct) {
      return Math.max(0, currentLevel - nextLevel);
    }
    return currentLevel >= nextLevel ? Math.max(currentRepetitions + 1, currentLevel + 1) : 1;
  }

  private async loadStatsOverview(): Promise<SrsStatsOverview> {
    const { data: authData } = await supabase.auth.getUser();
    const email = authData.user?.email;
    if (!email) throw new Error('Not authenticated');
    const userId = await this.getCurrentUserId(email);

    const { data: cardData, error: cardError } = await supabase
      .from('SRSCards')
      .select('Id, VocabularyId, KanjiId, BoxLevel')
      .eq('UserId', userId);
    if (cardError) throw cardError;

    const cards = (cardData ?? []) as {
      Id: number;
      VocabularyId: number | null;
      KanjiId: number | null;
      BoxLevel: number | null;
    }[];
    const cardIds = cards.map((c) => c.Id);

    const boxLevels = this.buildBoxLevelStats(cards);

    if (cardIds.length === 0) {
      return {
        totalReviews: 0,
        correctReviews: 0,
        accuracyRate: 0,
        boxLevels,
        mostWrong: [],
        accuracyTrend: [],
      };
    }

    const { data: logData, error: logError } = await supabase
      .from('SRSReviewLogs')
      .select('CardId, Rating, OldBoxLevel, NewBoxLevel, ReviewedAt')
      .in('CardId', cardIds)
      .order('ReviewedAt', { ascending: true });
    if (logError) throw logError;

    const logs = (logData ?? []) as {
      CardId: number;
      Rating: number;
      OldBoxLevel: number;
      NewBoxLevel: number;
      ReviewedAt: string;
    }[];

    const totalReviews = logs.length;
    const correctReviews = logs.filter((l) => l.Rating >= 3).length;
    const accuracyRate = totalReviews > 0 ? Math.round((correctReviews / totalReviews) * 100) : 0;

    const mostWrong = await this.buildMostWrong(logs, cards);
    const accuracyTrend = this.buildAccuracyTrend(logs);

    return { totalReviews, correctReviews, accuracyRate, boxLevels, mostWrong, accuracyTrend };
  }

  private buildBoxLevelStats(cards: { BoxLevel: number | null }[]): BoxLevelStat[] {
    const counts = new Map<number, number>();
    for (const card of cards) {
      const level = this.normalizeLevel(card.BoxLevel);
      counts.set(level, (counts.get(level) ?? 0) + 1);
    }
    return Array.from({ length: 8 }, (_, level) => ({
      boxLevel: level,
      count: counts.get(level) ?? 0,
    }));
  }

  private buildAccuracyTrend(logs: { Rating: number; ReviewedAt: string }[]): AccuracyPoint[] {
    const buckets = new Map<string, { correct: number; total: number }>();
    for (const log of logs) {
      const date = log.ReviewedAt.slice(0, 10);
      const bucket = buckets.get(date) ?? { correct: 0, total: 0 };
      bucket.total += 1;
      if (log.Rating >= 3) bucket.correct += 1;
      buckets.set(date, bucket);
    }
    return Array.from(buckets.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-14)
      .map(([date, stat]) => ({ date, correct: stat.correct, total: stat.total }));
  }

  private async buildMostWrong(
    logs: { CardId: number; Rating: number; OldBoxLevel: number; NewBoxLevel: number }[],
    cards: { Id: number; VocabularyId: number | null; KanjiId: number | null }[],
  ): Promise<MostWrongItem[]> {
    const wrongCounts = new Map<number, number>();
    for (const log of logs) {
      if (log.Rating <= 2 || log.NewBoxLevel < log.OldBoxLevel) {
        wrongCounts.set(log.CardId, (wrongCounts.get(log.CardId) ?? 0) + 1);
      }
    }

    const topEntries = Array.from(wrongCounts.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);
    if (topEntries.length === 0) return [];

    const cardMap = new Map(cards.map((c) => [c.Id, c]));
    const vocabIds = topEntries
      .map(([cardId]) => cardMap.get(cardId)?.VocabularyId)
      .filter((id): id is number => id != null);
    const kanjiIds = topEntries
      .map(([cardId]) => cardMap.get(cardId)?.KanjiId)
      .filter((id): id is number => id != null);

    const [vocabResult, kanjiResult] = await Promise.all([
      vocabIds.length > 0
        ? supabase.from('Vocabularies').select('Id, Word, Meaning').in('Id', vocabIds)
        : Promise.resolve({ data: [], error: null }),
      kanjiIds.length > 0
        ? supabase.from('Kanji').select('Id, Character, Meaning').in('Id', kanjiIds)
        : Promise.resolve({ data: [], error: null }),
    ]);

    const vocabMap = new Map(
      ((vocabResult.data ?? []) as { Id: number; Word: string; Meaning: string }[]).map((v) => [
        v.Id,
        v,
      ]),
    );
    const kanjiMap = new Map(
      ((kanjiResult.data ?? []) as { Id: number; Character: string; Meaning: string }[]).map(
        (k) => [k.Id, k],
      ),
    );

    return topEntries.map(([cardId, wrongCount]) => {
      const card = cardMap.get(cardId);
      const vocab = card?.VocabularyId != null ? vocabMap.get(card.VocabularyId) : null;
      const kanji = card?.KanjiId != null ? kanjiMap.get(card.KanjiId) : null;
      return {
        cardId,
        type: vocab ? 'vocabulary' : 'kanji',
        word: vocab?.Word ?? kanji?.Character ?? '—',
        meaning: vocab?.Meaning ?? kanji?.Meaning ?? '',
        wrongCount,
      };
    });
  }

  private async getCurrentUserId(email: string): Promise<number> {
    const { data: profile, error } = await supabase
      .from('Users')
      .select('Id')
      .eq('Email', email)
      .maybeSingle();
    if (error) throw error;
    if (!profile) throw new Error('User profile not found â€” please reload the page');
    return (profile as { Id: number }).Id;
  }

  private async getLessonSessionCacheKey(): Promise<string | null> {
    const { data } = await supabase.auth.getSession();
    const userId = data.session?.user.id;
    return userId ? `${LESSON_SESSION_CACHE_PREFIX}${userId}` : null;
  }
}
