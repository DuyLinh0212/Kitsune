import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, inject } from '@angular/core';

import { supabase } from '../supabase/supabase.client';
import { AuthService } from './auth.service';
import { AnswerInput, ExamQuestionDto, ExamQuestionType } from './exam.service';
import { SRSCardDto, SrsMode } from './srs.service';

export type KnowledgeStatus = 'strong' | 'growing' | 'weak' | 'learning';

export interface KnowledgeNode {
  id: string;
  label: string;
  score: number;
  correct: number;
  attempts: number;
  status: KnowledgeStatus;
  insight: string;
}

export interface LearningKnowledgeGraph {
  title: string;
  subtitle: string;
  overallScore: number;
  nodes: KnowledgeNode[];
}

type KnowledgeSource = 'SRS' | 'EXAM' | 'LEGACY';
type KnowledgeItemType = 'VOCABULARY' | 'KANJI' | 'GRAMMAR' | 'READING' | null;

interface KnowledgeEvidence {
  id: string;
  userId: number;
  skillCode: string;
  label: string;
  correct: boolean;
  source: KnowledgeSource;
  sourceCardId: number | null;
  sourceAttemptId: number | null;
  sourceQuestionId: number | null;
  sessionKey: string;
  questionMode: string;
  itemType: KnowledgeItemType;
  vocabularyId: number | null;
  kanjiId: number | null;
  strokeCount: number | null;
  responseTimeMs: number | null;
  createdAt: string;
}

interface LegacyKnowledgeEvidence {
  dimension?: unknown;
  label?: unknown;
  correct?: unknown;
  createdAt?: unknown;
}

interface KnowledgeStatsRow {
  UserId: number;
  SkillCode: string;
  Label: string;
  Attempts: number;
  Correct: number;
  Score: number;
}

interface EvidenceRow {
  SkillCode: string;
  IsCorrect: boolean;
  OccurredAt: string;
}

const SRS_SKILLS: Partial<Record<SrsMode, readonly [string, string]>> = {
  MEAN_FROM_WORD: ['shape_meaning', 'Nhớ mặt chữ & nghĩa'],
  WORD_FROM_MEAN: ['word_recall', 'Gợi nhớ từ vựng'],
  FILL_BLANK: ['vocab_context', 'Từ vựng trong ngữ cảnh'],
  ON_READ: ['on_reading', 'Âm On'],
  KUN_READ: ['kun_reading', 'Âm Kun'],
  HAN_VIET: ['han_viet', 'Âm Hán Việt'],
  COMPOSE_KANJI: ['shape_meaning', 'Nhớ mặt chữ & nghĩa'],
  DRAW_KANJI: ['handwriting', 'Viết Kanji'],
  KANJI_IN_CONTEXT: ['kanji_context', 'Kanji trong từ ghép'],
  WORD_FROM_HIRAGANA: ['word_recall', 'Hiragana → Kanji'],
};

const SKILL_LABELS: Readonly<Record<string, string>> = {
  shape_meaning: 'Nhớ mặt chữ & nghĩa',
  word_recall: 'Gợi nhớ từ vựng',
  vocab_context: 'Từ vựng trong ngữ cảnh',
  on_reading: 'Âm On',
  kun_reading: 'Âm Kun',
  han_viet: 'Âm Hán Việt',
  handwriting: 'Viết Kanji',
  kanji_context: 'Kanji trong từ ghép',
  stroke_1_8: 'Kanji 1–8 nét',
  stroke_9_14: 'Kanji 9–14 nét',
  stroke_15_plus: 'Kanji trên 14 nét',
  on_kun_reading: 'Đọc Kanji',
  vocabulary: 'Vốn từ & sắc thái',
  sentence_structure: 'Cấu trúc câu',
  grammar: 'Ngữ pháp',
  reading: 'Đọc hiểu',
};

@Injectable({ providedIn: 'root' })
export class LearningKnowledgeService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly authService = inject(AuthService);
  private flushPromise: Promise<void> | null = null;

  recordSrs(card: SRSCardDto, mode: SrsMode, correct: boolean): void {
    const userId = this.currentUserId();
    const skill = SRS_SKILLS[mode];
    if (userId === null || !skill) return;

    const sessionKey = this.uuid();
    const evidence: KnowledgeEvidence[] = [this.makeEvidence({
      userId,
      skillCode: skill[0],
      label: skill[1],
      correct,
      source: 'SRS',
      sourceCardId: card.id,
      sourceAttemptId: null,
      sourceQuestionId: null,
      sessionKey,
      questionMode: mode,
      itemType: card.type === 'kanji' ? 'KANJI' : 'VOCABULARY',
      vocabularyId: card.vocabularyId,
      kanjiId: card.kanjiId,
      strokeCount: card.strokeCount,
    })];

    if (card.type === 'kanji' && card.strokeCount != null) {
      const bucket = this.strokeSkill(card.strokeCount);
      evidence.push(this.makeEvidence({
        userId,
        skillCode: bucket[0],
        label: bucket[1],
        correct,
        source: 'SRS',
        sourceCardId: card.id,
        sourceAttemptId: null,
        sourceQuestionId: null,
        sessionKey,
        questionMode: mode,
        itemType: 'KANJI',
        vocabularyId: card.vocabularyId,
        kanjiId: card.kanjiId,
        strokeCount: card.strokeCount,
      }));
    }

    this.enqueue(evidence);
  }

  recordExam(questions: ExamQuestionDto[], answers: AnswerInput[], attemptId: number): void {
    const userId = this.currentUserId();
    if (userId === null) return;
    this.enqueue(this.examEvidence(questions, answers, userId, attemptId));
  }

  getProfileGraph(): LearningKnowledgeGraph {
    this.importLegacyEvidence();
    return this.buildGraph(
      this.readPending(),
      'Bản đồ năng lực cá nhân',
      'Dữ liệu mới trên thiết bị đang được đồng bộ với tài khoản của bạn.',
    );
  }

  async loadProfileGraph(): Promise<LearningKnowledgeGraph> {
    const userId = this.currentUserId();
    if (userId === null) return this.getProfileGraph();

    await this.flushPendingEvidence();
    const { data, error } = await supabase
      .from('LearningKnowledgeStats')
      .select('UserId, SkillCode, Label, Attempts, Correct, Score')
      .eq('UserId', userId);
    if (error) return this.getProfileGraph();

    return this.buildGraphFromStats(
      (data ?? []) as KnowledgeStatsRow[],
      'Bản đồ năng lực cá nhân',
      'Tổng hợp từ câu ôn tập và đề kiểm tra trên mọi thiết bị.',
    );
  }

  buildExamGraph(questions: ExamQuestionDto[], answers: AnswerInput[]): LearningKnowledgeGraph {
    const userId = this.currentUserId() ?? 0;
    return this.buildGraph(
      this.examEvidence(questions, answers, userId, null),
      'Bản đồ năng lực của đề này',
      'Mỗi nhánh được đánh giá từ dạng câu hỏi và đáp án trong lần làm đề.',
    );
  }

  async loadExamGraph(
    attemptId: number,
    questions: ExamQuestionDto[],
    answers: AnswerInput[],
  ): Promise<LearningKnowledgeGraph> {
    await this.flushPendingEvidence();
    const { data, error } = await supabase
      .from('LearningEvidence')
      .select('SkillCode, IsCorrect, OccurredAt')
      .eq('SourceAttemptId', attemptId)
      .order('OccurredAt', { ascending: true });
    if (error || !data || data.length === 0) return this.buildExamGraph(questions, answers);

    const evidence = (data as EvidenceRow[]).map((row) => this.makeEvidence({
      userId: this.currentUserId() ?? 0,
      skillCode: row.SkillCode,
      label: SKILL_LABELS[row.SkillCode] ?? row.SkillCode,
      correct: row.IsCorrect,
      source: 'EXAM',
      sourceCardId: null,
      sourceAttemptId: attemptId,
      sourceQuestionId: null,
      sessionKey: this.uuid(),
      questionMode: 'EXAM_RESULT',
      itemType: null,
      vocabularyId: null,
      kanjiId: null,
      strokeCount: null,
      createdAt: row.OccurredAt,
    }));
    return this.buildGraph(
      evidence,
      'Bản đồ năng lực của đề này',
      'Được đọc từ evidence đã lưu của lần làm đề này.',
    );
  }

  private examEvidence(
    questions: ExamQuestionDto[],
    answers: AnswerInput[],
    userId: number,
    attemptId: number | null,
  ): KnowledgeEvidence[] {
    const answerMap = new Map(answers.map((answer) => [answer.questionId, answer.isCorrect]));
    return questions.map((question) => {
      const skill = this.examSkill(question.questionType);
      return this.makeEvidence({
        userId,
        skillCode: skill[0],
        label: skill[1],
        correct: answerMap.get(question.id) ?? false,
        source: 'EXAM',
        sourceCardId: null,
        sourceAttemptId: attemptId,
        sourceQuestionId: question.id,
        sessionKey: this.uuid(),
        questionMode: question.questionType,
        itemType: this.examItemType(question.questionType),
        vocabularyId: null,
        kanjiId: null,
        strokeCount: null,
      });
    });
  }

  private examSkill(type: ExamQuestionType): readonly [string, string] {
    if (type === 'KANJI_READING') return ['on_kun_reading', 'Đọc Kanji'];
    if (type === 'KANJI_WRITING') return ['handwriting', 'Viết Kanji'];
    if (type === 'VOCAB_MEANING' || type === 'SYNONYM' || type === 'ANTONYM') {
      return ['vocabulary', 'Vốn từ & sắc thái'];
    }
    if (type === 'VOCAB_USAGE') return ['vocab_context', 'Dùng từ trong ngữ cảnh'];
    if (type === 'SENTENCE_ORDER') return ['sentence_structure', 'Cấu trúc câu'];
    if (type.startsWith('GRAMMAR_')) return ['grammar', 'Ngữ pháp'];
    return ['reading', 'Đọc hiểu'];
  }

  private examItemType(type: ExamQuestionType): KnowledgeItemType {
    if (type.startsWith('KANJI_')) return 'KANJI';
    if (type.startsWith('VOCAB_') || type === 'SYNONYM' || type === 'ANTONYM') return 'VOCABULARY';
    if (type.startsWith('GRAMMAR_') || type === 'SENTENCE_ORDER') return 'GRAMMAR';
    return 'READING';
  }

  private buildGraph(
    evidence: KnowledgeEvidence[],
    title: string,
    subtitle: string,
  ): LearningKnowledgeGraph {
    const groups = new Map<string, KnowledgeEvidence[]>();
    for (const item of evidence) groups.set(item.skillCode, [...(groups.get(item.skillCode) ?? []), item]);
    const nodes = [...groups.entries()].map(([id, items]): KnowledgeNode => {
      const correct = items.filter((item) => item.correct).length;
      return this.makeNode(id, items[0].label, correct, items.length);
    }).sort((left, right) => left.score - right.score || right.attempts - left.attempts);
    const total = evidence.length;
    const overallScore = total === 0 ? 0 : Math.round(evidence.filter((item) => item.correct).length / total * 100);
    return { title, subtitle, overallScore, nodes };
  }

  private buildGraphFromStats(
    stats: KnowledgeStatsRow[],
    title: string,
    subtitle: string,
  ): LearningKnowledgeGraph {
    const nodes = stats
      .map((row) => this.makeNode(row.SkillCode, row.Label, row.Correct, row.Attempts))
      .sort((left, right) => left.score - right.score || right.attempts - left.attempts);
    const totals = stats.reduce(
      (sum, row) => ({ correct: sum.correct + row.Correct, attempts: sum.attempts + row.Attempts }),
      { correct: 0, attempts: 0 },
    );
    const overallScore = totals.attempts === 0 ? 0 : Math.round(totals.correct / totals.attempts * 100);
    return { title, subtitle, overallScore, nodes };
  }

  private makeNode(id: string, label: string, correct: number, attempts: number): KnowledgeNode {
    const score = attempts === 0 ? 0 : Math.round(correct / attempts * 100);
    const status: KnowledgeStatus = attempts < 3
      ? 'learning'
      : score >= 78
        ? 'strong'
        : score <= 55
          ? 'weak'
          : 'growing';
    return { id, label, score, correct, attempts, status, insight: this.insight(status, score, attempts) };
  }

  private insight(status: KnowledgeStatus, score: number, attempts: number): string {
    if (status === 'learning') return `Mới có ${attempts} bằng chứng — tiếp tục luyện để đánh giá chính xác.`;
    if (status === 'strong') return `Điểm mạnh ổn định (${score}% đúng).`;
    if (status === 'weak') return `Nên ưu tiên ôn lại (${score}% đúng).`;
    return `Đang tiến bộ, cần thêm vài lượt củng cố (${score}% đúng).`;
  }

  private strokeSkill(strokeCount: number): readonly [string, string] {
    if (strokeCount > 14) return ['stroke_15_plus', 'Kanji trên 14 nét'];
    if (strokeCount >= 9) return ['stroke_9_14', 'Kanji 9–14 nét'];
    return ['stroke_1_8', 'Kanji 1–8 nét'];
  }

  private makeEvidence(input: Omit<KnowledgeEvidence, 'id' | 'responseTimeMs' | 'createdAt'> & {
    responseTimeMs?: number | null;
    createdAt?: string;
  }): KnowledgeEvidence {
    return {
      ...input,
      id: this.uuid(),
      responseTimeMs: input.responseTimeMs ?? null,
      createdAt: input.createdAt ?? new Date().toISOString(),
    };
  }

  private enqueue(items: KnowledgeEvidence[]): void {
    if (!isPlatformBrowser(this.platformId) || items.length === 0) return;
    this.importLegacyEvidence();
    const next = [...this.readPending(), ...items].slice(-2000);
    localStorage.setItem(this.pendingStorageKey(), JSON.stringify(next));
    void this.flushPendingEvidence();
  }

  private async flushPendingEvidence(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;
    if (this.flushPromise) return this.flushPromise;
    this.flushPromise = this.flushPendingEvidenceCore().finally(() => {
      this.flushPromise = null;
    });
    return this.flushPromise;
  }

  private async flushPendingEvidenceCore(): Promise<void> {
    this.importLegacyEvidence();
    const pending = this.readPending();
    if (pending.length === 0) return;

    const rows = pending.map((item) => ({
      Id: item.id,
      UserId: item.userId,
      SkillCode: item.skillCode,
      SourceType: item.source,
      SourceCardId: item.sourceCardId,
      SourceAttemptId: item.sourceAttemptId,
      SourceQuestionId: item.sourceQuestionId,
      SessionKey: item.sessionKey,
      QuestionMode: item.questionMode,
      ItemType: item.itemType,
      VocabularyId: item.vocabularyId,
      KanjiId: item.kanjiId,
      StrokeCount: item.strokeCount,
      IsCorrect: item.correct,
      ResponseTimeMs: item.responseTimeMs,
      Properties: {},
      OccurredAt: item.createdAt,
    }));
    const { error } = await supabase
      .from('LearningEvidence')
      .upsert(rows, { onConflict: 'Id', ignoreDuplicates: true });
    if (error) return;

    const persistedIds = new Set(pending.map((item) => item.id));
    const remaining = this.readPending().filter((item) => !persistedIds.has(item.id));
    localStorage.setItem(this.pendingStorageKey(), JSON.stringify(remaining));
  }

  private importLegacyEvidence(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const userId = this.currentUserId();
    if (userId === null) return;
    const key = `kitsune:knowledge-evidence:v1:${userId}`;
    const raw = localStorage.getItem(key);
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw) as LegacyKnowledgeEvidence[];
      if (!Array.isArray(parsed)) return;
      const migrated = parsed
        .filter((item) => typeof item.dimension === 'string' && typeof item.correct === 'boolean')
        .map((item) => this.makeEvidence({
          userId,
          skillCode: item.dimension as string,
          label: typeof item.label === 'string'
            ? item.label
            : SKILL_LABELS[item.dimension as string] ?? item.dimension as string,
          correct: item.correct as boolean,
          source: 'LEGACY',
          sourceCardId: null,
          sourceAttemptId: null,
          sourceQuestionId: null,
          sessionKey: this.uuid(),
          questionMode: 'LEGACY_LOCAL',
          itemType: null,
          vocabularyId: null,
          kanjiId: null,
          strokeCount: null,
          createdAt: typeof item.createdAt === 'string' ? item.createdAt : new Date().toISOString(),
        }));
      const next = [...this.readPending(), ...migrated].slice(-2000);
      localStorage.setItem(this.pendingStorageKey(), JSON.stringify(next));
      localStorage.removeItem(key);
    } catch {
      // Preserve malformed legacy data for manual recovery instead of deleting it.
    }
  }

  private readPending(): KnowledgeEvidence[] {
    if (!isPlatformBrowser(this.platformId)) return [];
    try {
      const raw = localStorage.getItem(this.pendingStorageKey());
      const parsed = raw ? JSON.parse(raw) as KnowledgeEvidence[] : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private currentUserId(): number | null {
    return this.authService.getStoredUser()?.id ?? null;
  }

  private pendingStorageKey(): string {
    return `kitsune:knowledge-evidence:pending:v2:${this.currentUserId() ?? 'guest'}`;
  }

  private uuid(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
      const random = Math.floor(Math.random() * 16);
      const value = char === 'x' ? random : (random & 0x3) | 0x8;
      return value.toString(16);
    });
  }
}
