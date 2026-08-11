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
  | 'HAN_VIET'
  | 'COMPOSE_KANJI'
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
  boxLevel: number;
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

const ACTIVE_FOLDER_STORAGE_KEY = 'kitsune.srs.activeFolderId';
const DAILY_GOAL_STORAGE_PREFIX = 'kitsune.srs.dailyGoal.';
const DAILY_LEARNED_STORAGE_PREFIX = 'kitsune.srs.learnedCards.';
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
const LEGACY_BOX_LEVEL_INTERVALS_MS: Record<number, number> = {
  1: 60 * 60 * 1000,
  2: 24 * 60 * 60 * 1000,
  3: 3 * 24 * 60 * 60 * 1000,
  4: 7 * 24 * 60 * 60 * 1000,
  5: 14 * 24 * 60 * 60 * 1000,
  6: 30 * 24 * 60 * 60 * 1000,
  7: 90 * 24 * 60 * 60 * 1000,
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
      String(Math.max(1, Math.floor(goal)))
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

  getFolderOverview(folderId: number): Observable<FolderSrsOverview> {
    return from(this.loadFolderSession(folderId)).pipe(
      map((session) => {
        if (!session) {
          throw new Error('Không tìm thấy session SRS cho folder này.');
        }
        return session.overview;
      })
    );
  }

  getFolderSession(folderId?: number): Observable<FolderSrsSession | null> {
    return from(this.loadFolderSession(folderId ?? undefined));
  }

  getDueCards(folderId?: number): Observable<SRSCardDto[]> {
    return from(this.loadFolderSession(folderId ?? undefined)).pipe(
      map((session) => session?.cards ?? [])
    );
  }

  activateFolder(folderId: number): Observable<FolderSrsSession> {
    return from(this.activateFolderNow(folderId));
  }

  completeFlashcard(cardId: number): Observable<SrsCardProgressUpdate> {
    return from(this.updateCardProgress(cardId, true, true));
  }

  submitQuizAnswer(cardId: number, correct: boolean): Observable<SrsCardProgressUpdate> {
    return from(this.updateCardProgress(cardId, correct, false));
  }

  submitReview(cardId: number, rating: 1 | 2 | 3 | 4): Observable<void> {
    return this.submitQuizAnswer(cardId, rating >= 3).pipe(map(() => void 0));
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
    const quizCards = cards.filter((card) => card.boxLevel > 0 && card.isDue);

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

  private async updateCardProgress(
    cardId: number,
    correct: boolean,
    flashcard: boolean
  ): Promise<SrsCardProgressUpdate> {
    const { data: authData } = await supabase.auth.getUser();
    const email = authData.user?.email;
    if (!email) throw new Error('Not authenticated');

    const userId = await this.getCurrentUserId(email);
    const { data, error } = await supabase
      .from('SRSCards')
      .select('Id, UserId, VocabularyId, KanjiId, BoxLevel, EaseFactor, IntervalDays, Repetitions, NextReviewDate, LastReviewedAt')
      .eq('Id', cardId)
      .eq('UserId', userId)
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new Error('Không tìm thấy thẻ SRS');

    const row = data as DbCardRow;
    const currentLevel = this.normalizeLevel(row.BoxLevel);
    const nextLevel = flashcard ? 1 : this.resolveNextLevel(currentLevel, correct);
    const reviewedAt = new Date();
    const nextReviewDate = this.computeNextReviewDate(nextLevel, reviewedAt.getTime());

    const patch: Record<string, unknown> = {
      BoxLevel: nextLevel,
      EaseFactor: 2.5,
      IntervalDays: this.intervalDays(nextLevel),
      Repetitions: this.resolveRepetitions(currentLevel, nextLevel, correct),
      NextReviewDate: nextReviewDate,
      LastReviewedAt: reviewedAt.toISOString(),
    };

    const { error: updateError } = await supabase.from('SRSCards').update(patch).eq('Id', cardId).eq('UserId', userId);
    if (updateError) throw updateError;

    const rating = flashcard ? 3 : correct ? 3 : 1;
    const { error: logError } = await supabase.from('SRSReviewLogs').insert({
      CardId: cardId,
      Rating: rating,
      OldBoxLevel: currentLevel,
      NewBoxLevel: nextLevel,
      OldEaseFactor: row.EaseFactor ?? 2.5,
      NewEaseFactor: 2.5,
      ReviewedAt: reviewedAt.toISOString(),
    });
    if (logError) console.warn('Không thể ghi log ôn tập SRS:', logError.message);
    if (flashcard) this.recordLocalNewCard(cardId);

    return {
      cardId,
      boxLevel: nextLevel,
      intervalDays: this.intervalDays(nextLevel),
      nextReviewDate,
      wrongReviewCountDelta: correct || flashcard ? 0 : 1,
    };
  }

  private async loadFolderContext(folderId: number, userId: number): Promise<{
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

    const kanjiComponents = vocabIds.length === 0
      ? []
      : await this.loadKanjiComponents(vocabIds);

    const componentsByVocabulary = new Map<number, KanjiComponentRow[]>();
    for (const component of kanjiComponents) {
      const current = componentsByVocabulary.get(component.VocabularyId) ?? [];
      current.push(component);
      componentsByVocabulary.set(component.VocabularyId, current);
    }
    const vocabs = allVocabs.filter((vocab) =>
      !this.isKanjiOnlyVocabulary(vocab, componentsByVocabulary.get(vocab.Id) ?? [])
    );

    const kanjiIds = this.uniqueKanji(kanjiComponents).map((kanji) => kanji.Id);
    const visibleVocabIds = new Set(vocabs.map((vocab) => vocab.Id));
    const visibleKanjiIds = new Set(kanjiIds);
    const allCards = await this.loadFolderCards(
      userId,
      [...visibleVocabIds],
      [...visibleKanjiIds]
    );
    const folderCardIds = allCards
      .filter((card) =>
        card.VocabularyId != null
          ? visibleVocabIds.has(card.VocabularyId)
          : card.KanjiId != null && visibleKanjiIds.has(card.KanjiId)
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
    kanjiIds: number[]
  ): Promise<DbCardRow[]> {
    if (vocabularyIds.length === 0 && kanjiIds.length === 0) return [];

    let query = supabase
      .from('SRSCards')
      .select('Id, UserId, VocabularyId, KanjiId, BoxLevel, EaseFactor, IntervalDays, Repetitions, NextReviewDate, LastReviewedAt')
      .eq('UserId', userId);

    if (vocabularyIds.length > 0 && kanjiIds.length > 0) {
      query = query.or(
        `VocabularyId.in.(${vocabularyIds.join(',')}),KanjiId.in.(${kanjiIds.join(',')})`
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
      const row = log as { CardId: number; Rating: number; OldBoxLevel: number; NewBoxLevel: number };
      if (row.Rating <= 2 || row.NewBoxLevel < row.OldBoxLevel) {
        counts.set(row.CardId, (counts.get(row.CardId) ?? 0) + 1);
      }
    }

    return counts;
  }

  private async loadKanjiExamples(kanjiIds: number[]): Promise<Map<number, SrsVocabularyExample[]>> {
    const examples = new Map<number, SrsVocabularyExample[]>();
    if (kanjiIds.length === 0) return examples;

    const { data, error } = await supabase
      .from('KanjiComponents')
      .select('KanjiId, VocabularyId, Vocabulary:VocabularyId(Id, Word, Pronunciation, Meaning, FolderId, SpecificData)')
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

  private async loadKanjiComponents(vocabIds: number[]): Promise<KanjiComponentRow[]> {
    const { data, error } = await supabase
      .from('KanjiComponents')
      .select(`
        VocabularyId,
        KanjiId,
        "Order",
        Kanji:KanjiId(
          Id, Character, AmHanViet, Meaning, StrokeCount, Onyomi, Kunyomi,
          Radical:RadicalId(RadicalCharacter, RadicalName)
        )
      `)
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

  private async insertMissingCards(context: Awaited<ReturnType<SrsService['loadFolderContext']>>): Promise<boolean> {
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
    const rows = context.cards.filter((row) =>
      this.belongsToFolder(row, vocabMap, kanjiMap)
    );

    return rows
      .map((row) => this.mapRowToCard(
        row,
        vocabMap,
        kanjiMap,
        context.kanjiExamples,
        context.wrongReviewCounts,
        context.folderId,
        now
      ))
      .sort((a, b) => this.sortValue(a) - this.sortValue(b));
  }

  private mapRowToCard(
    row: DbCardRow,
    vocabMap: Map<number, VocabRow>,
    kanjiMap: Map<number, KanjiRow>,
    kanjiExamples: Map<number, SrsVocabularyExample[]>,
    wrongReviewCounts: Map<number, number>,
    folderId: number,
    now: number
  ): SRSCardDto {
    const vocab = row.VocabularyId != null ? vocabMap.get(row.VocabularyId) : null;
    const kanji = row.KanjiId != null ? kanjiMap.get(row.KanjiId) : null;
    const boxLevel = this.normalizeLevel(row.BoxLevel);
    const nextReviewDate = this.effectiveNextReviewDate(row, boxLevel, now);
    const isDue = new Date(nextReviewDate).getTime() <= now || boxLevel === 0;

    return {
      id: row.Id,
      userId: row.UserId,
      folderId,
      type: row.VocabularyId != null ? 'vocabulary' : 'kanji',
      vocabularyId: row.VocabularyId,
      kanjiId: row.KanjiId,
      word: vocab?.Word ?? kanji?.Character ?? '',
      pronunciation: vocab?.Pronunciation ?? null,
      meaning: vocab?.Meaning ?? kanji?.Meaning ?? '',
      character: kanji?.Character ?? null,
      amHanViet: kanji?.AmHanViet ?? null,
      onyomi: kanji?.Onyomi ?? null,
      kunyomi: kanji?.Kunyomi ?? null,
      examples: row.KanjiId != null ? (kanjiExamples.get(row.KanjiId) ?? []) : [],
      strokeCount: kanji?.StrokeCount ?? null,
      radicalCharacter: kanji?.Radical?.RadicalCharacter ?? null,
      radicalName: kanji?.Radical?.RadicalName ?? null,
      boxLevel,
      wrongReviewCount: wrongReviewCounts.get(row.Id) ?? 0,
      nextReviewDate,
      isDue,
      isNew: boxLevel === 0,
    };
  }

  private buildOverview(folder: FolderRow, cards: SRSCardDto[], todayNewLearned: number): FolderSrsOverview {
    const totalCards = cards.length;
    const newCards = cards.filter((card) => card.boxLevel === 0).length;
    const dueCards = cards.filter((card) => card.boxLevel > 0 && card.isDue).length;
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
      .filter((card) => !card.isDue && card.nextReviewDate)
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

  private belongsToFolder(
    row: DbCardRow,
    vocabMap: Map<number, VocabRow>,
    kanjiMap: Map<number, KanjiRow>
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
    components: KanjiComponentRow[] = []
  ): boolean {
    const itemType = vocab.SpecificData?.['_kitsuneItemType'];
    if (itemType === 'kanji') return true;
    if (itemType === 'vocabulary' || vocab.SpecificData) return false;

    return vocab.Word.trim().length === 1 &&
      components.length === 1 &&
      components[0].Kanji.Character === vocab.Word.trim();
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
      JSON.stringify([...ids])
    );
  }

  private getLocalNewCardIds(): Set<number> {
    if (typeof window === 'undefined') return new Set<number>();
    const raw = window.localStorage.getItem(`${DAILY_LEARNED_STORAGE_PREFIX}${this.localDateKey()}`);
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
    const storedValue = row.NextReviewDate ?? new Date(now).toISOString();
    const shortenedInterval = BOX_LEVEL_INTERVALS_MS[level] ?? 0;
    if (level === 0 || shortenedInterval <= 0) return storedValue;

    const storedTime = Date.parse(storedValue);
    if (!Number.isFinite(storedTime)) {
      return storedValue;
    }

    if (!row.LastReviewedAt) {
      const latestCurrentScheduleTime = now + shortenedInterval;
      if (storedTime <= latestCurrentScheduleTime) return storedValue;

      const legacyInterval = LEGACY_BOX_LEVEL_INTERVALS_MS[level] ?? shortenedInterval;
      const shortenedLegacyTime = storedTime - legacyInterval + shortenedInterval;
      return new Date(shortenedLegacyTime).toISOString();
    }

    const lastReviewedTime = Date.parse(row.LastReviewedAt);
    if (!Number.isFinite(lastReviewedTime)) return storedValue;

    const shortenedTime = lastReviewedTime + shortenedInterval;
    return shortenedTime < storedTime ? new Date(shortenedTime).toISOString() : storedValue;
  }

  private intervalDays(level: number): number {
    const interval = BOX_LEVEL_INTERVALS_MS[level] ?? 0;
    if (interval <= 0) return 0;
    return Math.max(1, Math.floor(interval / (24 * 60 * 60 * 1000)));
  }

  private resolveRepetitions(currentLevel: number, nextLevel: number, correct: boolean): number {
    if (!correct) {
      return Math.max(0, currentLevel - nextLevel);
    }
    return currentLevel >= nextLevel ? currentLevel + 1 : 1;
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

    const cards = (cardData ?? []) as { Id: number; VocabularyId: number | null; KanjiId: number | null; BoxLevel: number | null }[];
    const cardIds = cards.map((c) => c.Id);

    const boxLevels = this.buildBoxLevelStats(cards);

    if (cardIds.length === 0) {
      return { totalReviews: 0, correctReviews: 0, accuracyRate: 0, boxLevels, mostWrong: [], accuracyTrend: [] };
    }

    const { data: logData, error: logError } = await supabase
      .from('SRSReviewLogs')
      .select('CardId, Rating, OldBoxLevel, NewBoxLevel, ReviewedAt')
      .in('CardId', cardIds)
      .order('ReviewedAt', { ascending: true });
    if (logError) throw logError;

    const logs = (logData ?? []) as { CardId: number; Rating: number; OldBoxLevel: number; NewBoxLevel: number; ReviewedAt: string }[];

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
    return Array.from({ length: 8 }, (_, level) => ({ boxLevel: level, count: counts.get(level) ?? 0 }));
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
    cards: { Id: number; VocabularyId: number | null; KanjiId: number | null }[]
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

    const vocabMap = new Map(((vocabResult.data ?? []) as { Id: number; Word: string; Meaning: string }[]).map((v) => [v.Id, v]));
    const kanjiMap = new Map(((kanjiResult.data ?? []) as { Id: number; Character: string; Meaning: string }[]).map((k) => [k.Id, k]));

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

}
