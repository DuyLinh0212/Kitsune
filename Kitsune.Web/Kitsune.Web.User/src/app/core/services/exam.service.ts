import { Injectable } from '@angular/core';
import { from, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { supabase } from '../supabase/supabase.client';

// ── Các mã dạng câu hỏi JLPT được hỗ trợ ─────────────────────────────────
export const EXAM_QUESTION_TYPES = [
  'KANJI_READING',
  'KANJI_WRITING',
  'VOCAB_MEANING',
  'VOCAB_USAGE',
  'SYNONYM',
  'ANTONYM',
  'GRAMMAR_FILL',
  'SENTENCE_ORDER',
  'GRAMMAR_SELECTION',
  'GRAMMAR_CONTEXT',
  'READING_SHORT',
  'READING_MEDIUM',
  'READING_LONG',
  'READING_INFORMATION',
  'READING_COMPARE'
] as const;

export type ExamQuestionType = (typeof EXAM_QUESTION_TYPES)[number];

export const EXAM_QUESTION_TYPE_LABELS: Record<ExamQuestionType, string> = {
  KANJI_READING: 'Cách đọc Kanji',
  KANJI_WRITING: 'Viết Kanji',
  VOCAB_MEANING: 'Nghĩa từ vựng',
  VOCAB_USAGE: 'Cách dùng từ',
  SYNONYM: 'Từ đồng nghĩa',
  ANTONYM: 'Từ trái nghĩa',
  GRAMMAR_FILL: 'Điền ngữ pháp',
  SENTENCE_ORDER: 'Sắp xếp câu',
  GRAMMAR_SELECTION: 'Chọn ngữ pháp',
  GRAMMAR_CONTEXT: 'Ngữ pháp theo ngữ cảnh',
  READING_SHORT: 'Đọc hiểu ngắn',
  READING_MEDIUM: 'Đọc hiểu trung bình',
  READING_LONG: 'Đọc hiểu dài',
  READING_INFORMATION: 'Đọc hiểu thông tin',
  READING_COMPARE: 'Đọc hiểu so sánh'
};

export interface ExamQuestionInput {
  questionType: ExamQuestionType;
  questionText: string | null;
  passageText: string | null;
  options: string[];
  correctAnswer: string;
  explanation: string | null;
}

export interface ExamQuestionDto extends ExamQuestionInput {
  id: number;
  orderIndex: number;
}

export interface ExamSummaryDto {
  id: number;
  creatorId: number;
  creatorName: string;
  title: string;
  description: string | null;
  jlptLevel: number | null;
  timeLimitInSeconds: number | null;
  isPublic: boolean;
  createdAt: string;
  questionCount: number;
}

export interface ExamDetailDto {
  id: number;
  creatorId: number;
  title: string;
  description: string | null;
  jlptLevel: number | null;
  timeLimitInSeconds: number | null;
  isPublic: boolean;
  questions: ExamQuestionDto[];
}

export interface CreateExamInput {
  title: string;
  description: string | null;
  jlptLevel: number | null;
  timeLimitInSeconds: number | null;
  isPublic: boolean;
  questions: ExamQuestionInput[];
}

export interface AnswerInput {
  questionId: number;
  selectedAnswer: string;
  isCorrect: boolean;
}

export interface SaveAttemptInput {
  examId: number;
  timeSpentInSeconds: number;
  answers: AnswerInput[];
  totalQuestionsCount: number;
}

export interface AttemptResultDto {
  id: number;
  examId: number;
  accuracyPercentage: number;
  timeSpentInSeconds: number;
  correctAnswersCount: number;
  totalQuestionsCount: number;
  createdAt: string;
}

export interface AttemptAnswerDetailDto {
  questionId: number;
  selectedAnswer: string | null;
  isCorrect: boolean;
}

const EXAM_LIST_SELECT = `
  Id, CreatorId, Title, Description, JlptLevel, TimeLimitInSeconds, IsPublic, CreatedAt,
  Users:CreatorId(Username, FullName),
  ExamQuestions(count)
`;

@Injectable({ providedIn: 'root' })
export class ExamService {
  // ── Helper: lấy Users.Id của người đang đăng nhập (qua Email) ──────────
  private async getCurrentUserId(): Promise<number> {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user?.email) throw new Error('Bạn cần đăng nhập.');
    const { data: profile, error: pe } = await supabase
      .from('Users')
      .select('Id')
      .eq('Email', data.user.email)
      .maybeSingle();
    if (pe) throw pe;
    if (!profile) throw new Error('Không tìm thấy hồ sơ người dùng.');
    return (profile as { Id: number }).Id;
  }

  // ── Duyệt đề công khai ─────────────────────────────────────────────────
  listPublic(query = '', jlptLevel: number | null = null): Observable<ExamSummaryDto[]> {
    let builder = supabase
      .from('Exams')
      .select(EXAM_LIST_SELECT)
      .eq('IsPublic', true)
      .eq('IsDeleted', false);

    const q = query.trim();
    if (q) builder = builder.ilike('Title', `%${q}%`);
    if (jlptLevel !== null) builder = builder.eq('JlptLevel', jlptLevel);

    return from(builder.order('CreatedAt', { ascending: false })).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return (data as Record<string, unknown>[]).map((r) => this.mapSummary(r));
      })
    );
  }

  // ── Đề của tôi ─────────────────────────────────────────────────────────
  listMine(): Observable<ExamSummaryDto[]> {
    return from(this.listMineAsync()).pipe(
      map((rows) => rows.map((r) => this.mapSummary(r)))
    );
  }

  private async listMineAsync(): Promise<Record<string, unknown>[]> {
    const userId = await this.getCurrentUserId();
    const { data, error } = await supabase
      .from('Exams')
      .select(EXAM_LIST_SELECT)
      .eq('CreatorId', userId)
      .eq('IsDeleted', false)
      .order('CreatedAt', { ascending: false });
    if (error) throw error;
    return (data as Record<string, unknown>[]) ?? [];
  }

  // ── Tải đề để làm bài ──────────────────────────────────────────────────
  getExamForPlay(examId: number): Observable<ExamDetailDto> {
    return from(
      supabase
        .from('Exams')
        .select(`
          Id, CreatorId, Title, Description, JlptLevel, TimeLimitInSeconds, IsPublic,
          ExamQuestions(Id, QuestionType, QuestionText, PassageText, OptionsJson, CorrectAnswer, Explanation, OrderIndex)
        `)
        .eq('Id', examId)
        .eq('IsDeleted', false)
        .single()
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return this.mapDetail(data as Record<string, unknown>);
      })
    );
  }

  // ── Tạo đề + câu hỏi ───────────────────────────────────────────────────
  create(input: CreateExamInput): Observable<number> {
    return from(this.createAsync(input));
  }

  private async createAsync(input: CreateExamInput): Promise<number> {
    const userId = await this.getCurrentUserId();
    const { data: exam, error: ee } = await supabase
      .from('Exams')
      .insert({
        CreatorId: userId,
        Title: input.title,
        Description: input.description,
        JlptLevel: input.jlptLevel,
        TimeLimitInSeconds: input.timeLimitInSeconds,
        IsPublic: input.isPublic
      })
      .select('Id')
      .single();
    if (ee) throw ee;

    const examId = (exam as { Id: number }).Id;
    await this.insertQuestions(examId, input.questions);
    return examId;
  }

  private async insertQuestions(examId: number, questions: ExamQuestionInput[]): Promise<void> {
    if (questions.length === 0) return;
    const rows = questions.map((q, index) => ({
      ExamId: examId,
      QuestionType: q.questionType,
      QuestionText: q.questionText,
      PassageText: q.passageText,
      OptionsJson: q.options,
      CorrectAnswer: q.correctAnswer,
      Explanation: q.explanation,
      OrderIndex: index
    }));
    const { error } = await supabase.from('ExamQuestions').insert(rows);
    if (error) throw error;
  }

  // ── Cập nhật metadata đề ───────────────────────────────────────────────
  updateMeta(
    examId: number,
    patch: { title?: string; description?: string | null; jlptLevel?: number | null; timeLimitInSeconds?: number | null }
  ): Observable<void> {
    const update: Record<string, unknown> = {};
    if (patch.title !== undefined) update['Title'] = patch.title;
    if (patch.description !== undefined) update['Description'] = patch.description;
    if (patch.jlptLevel !== undefined) update['JlptLevel'] = patch.jlptLevel;
    if (patch.timeLimitInSeconds !== undefined) update['TimeLimitInSeconds'] = patch.timeLimitInSeconds;
    return from(supabase.from('Exams').update(update).eq('Id', examId)).pipe(
      map(({ error }) => { if (error) throw error; })
    );
  }

  setPublic(examId: number, isPublic: boolean): Observable<void> {
    return from(supabase.from('Exams').update({ IsPublic: isPublic }).eq('Id', examId)).pipe(
      map(({ error }) => { if (error) throw error; })
    );
  }

  softDelete(examId: number): Observable<void> {
    return from(
      supabase.from('Exams').update({ IsDeleted: true, DeletedAt: new Date().toISOString() }).eq('Id', examId)
    ).pipe(map(({ error }) => { if (error) throw error; }));
  }

  // ── Lưu kết quả làm bài (attempt + từng câu trả lời) ──────────────────
  saveAttempt(input: SaveAttemptInput): Observable<number> {
    return from(this.saveAttemptAsync(input));
  }

  private async saveAttemptAsync(input: SaveAttemptInput): Promise<number> {
    const userId = await this.getCurrentUserId();
    const correct = input.answers.filter((a) => a.isCorrect).length;
    const total = input.totalQuestionsCount;
    const accuracy = total > 0 ? Math.round((correct / total) * 10000) / 100 : 0;

    const { data: attempt, error: ae } = await supabase
      .from('ExamAttempts')
      .insert({
        ExamId: input.examId,
        UserId: userId,
        AccuracyPercentage: accuracy,
        TimeSpentInSeconds: input.timeSpentInSeconds,
        CorrectAnswersCount: correct,
        TotalQuestionsCount: total
      })
      .select('Id')
      .single();
    if (ae) throw ae;

    const attemptId = (attempt as { Id: number }).Id;

    if (input.answers.length > 0) {
      const rows = input.answers.map((a) => ({
        AttemptId: attemptId,
        QuestionId: a.questionId,
        SelectedAnswer: a.selectedAnswer,
        IsCorrect: a.isCorrect
      }));
      const { error: answerError } = await supabase.from('ExamAttemptAnswers').insert(rows);
      if (answerError) throw answerError;
    }

    return attemptId;
  }

  getAttempt(attemptId: number): Observable<AttemptResultDto> {
    return from(
      supabase
        .from('ExamAttempts')
        .select('Id, ExamId, AccuracyPercentage, TimeSpentInSeconds, CorrectAnswersCount, TotalQuestionsCount, CreatedAt')
        .eq('Id', attemptId)
        .single()
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        const r = data as Record<string, unknown>;
        return {
          id: r['Id'] as number,
          examId: r['ExamId'] as number,
          accuracyPercentage: (r['AccuracyPercentage'] as number) ?? 0,
          timeSpentInSeconds: (r['TimeSpentInSeconds'] as number) ?? 0,
          correctAnswersCount: (r['CorrectAnswersCount'] as number) ?? 0,
          totalQuestionsCount: (r['TotalQuestionsCount'] as number) ?? 0,
          createdAt: r['CreatedAt'] as string
        };
      })
    );
  }

  getAttemptAnswers(attemptId: number): Observable<AttemptAnswerDetailDto[]> {
    return from(
      supabase
        .from('ExamAttemptAnswers')
        .select('QuestionId, SelectedAnswer, IsCorrect')
        .eq('AttemptId', attemptId)
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return (data as Record<string, unknown>[]).map((r) => ({
          questionId: r['QuestionId'] as number,
          selectedAnswer: (r['SelectedAnswer'] as string | null) ?? null,
          isCorrect: (r['IsCorrect'] as boolean) ?? false
        }));
      })
    );
  }

  // ── Mappers ────────────────────────────────────────────────────────────
  private mapSummary(r: Record<string, unknown>): ExamSummaryDto {
    const creator = r['Users'] as { Username: string; FullName: string | null } | null;
    const count = (r['ExamQuestions'] as Array<{ count: number }> | null)?.[0]?.count ?? 0;
    return {
      id: r['Id'] as number,
      creatorId: r['CreatorId'] as number,
      creatorName: creator?.FullName ?? creator?.Username ?? 'Ẩn danh',
      title: r['Title'] as string,
      description: (r['Description'] as string | null) ?? null,
      jlptLevel: (r['JlptLevel'] as number | null) ?? null,
      timeLimitInSeconds: (r['TimeLimitInSeconds'] as number | null) ?? null,
      isPublic: (r['IsPublic'] as boolean) ?? false,
      createdAt: r['CreatedAt'] as string,
      questionCount: count
    };
  }

  private mapDetail(r: Record<string, unknown>): ExamDetailDto {
    const rawQuestions = (r['ExamQuestions'] as Array<Record<string, unknown>> | null) ?? [];
    const questions: ExamQuestionDto[] = rawQuestions
      .map((q) => ({
        id: q['Id'] as number,
        questionType: q['QuestionType'] as ExamQuestionType,
        questionText: (q['QuestionText'] as string | null) ?? null,
        passageText: (q['PassageText'] as string | null) ?? null,
        options: (q['OptionsJson'] as string[]) ?? [],
        correctAnswer: q['CorrectAnswer'] as string,
        explanation: (q['Explanation'] as string | null) ?? null,
        orderIndex: (q['OrderIndex'] as number) ?? 0
      }))
      .sort((a, b) => a.orderIndex - b.orderIndex);

    return {
      id: r['Id'] as number,
      creatorId: r['CreatorId'] as number,
      title: r['Title'] as string,
      description: (r['Description'] as string | null) ?? null,
      jlptLevel: (r['JlptLevel'] as number | null) ?? null,
      timeLimitInSeconds: (r['TimeLimitInSeconds'] as number | null) ?? null,
      isPublic: (r['IsPublic'] as boolean) ?? false,
      questions
    };
  }
}
