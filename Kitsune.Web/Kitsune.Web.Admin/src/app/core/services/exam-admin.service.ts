import { Injectable } from '@angular/core';
import { from, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { supabase } from '../supabase/supabase.client';

// ── Các mã dạng câu hỏi JLPT được hỗ trợ (giống app User) ────────────────
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

export interface CreateExamInput {
  title: string;
  description: string | null;
  jlptLevel: number | null;
  timeLimitInSeconds: number | null;
  isPublic: boolean;
  questions: ExamQuestionInput[];
}

// Exam admin: full control over ALL exams (any creator).
export interface AdminExamDto {
  id: number;
  creatorId: number;
  creatorName: string;
  title: string;
  description: string | null;
  jlptLevel: number | null;
  timeLimitInSeconds: number | null;
  isPublic: boolean;
  isDeleted: boolean;
  createdAt: string;
  questionCount: number;
  attemptCount: number;
}

export interface AdminExamQuestionDto {
  id: number;
  questionType: string;
  questionText: string | null;
  passageText: string | null;
  optionsJson: string[];
  correctAnswer: string;
  explanation: string | null;
  orderIndex: number;
}

@Injectable({ providedIn: 'root' })
export class ExamAdminService {
  // ── Helper: lấy Users.Id của admin đang đăng nhập (qua Email) ──────────
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

  // ── Tạo đề + câu hỏi (admin là tác giả) ────────────────────────────────
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
    if (input.questions.length > 0) {
      const rows = input.questions.map((q, index) => ({
        ExamId: examId,
        QuestionType: q.questionType,
        QuestionText: q.questionText,
        PassageText: q.passageText,
        OptionsJson: q.options,
        CorrectAnswer: q.correctAnswer,
        Explanation: q.explanation,
        OrderIndex: index
      }));
      const { error: qe } = await supabase.from('ExamQuestions').insert(rows);
      if (qe) throw qe;
    }
    return examId;
  }

  getAllExams(): Observable<AdminExamDto[]> {
    return from(
      supabase
        .from('Exams')
        .select(`
          Id, CreatorId, Title, Description, JlptLevel, TimeLimitInSeconds, IsPublic, IsDeleted, CreatedAt,
          Users:CreatorId(Username, FullName),
          ExamQuestions(count),
          ExamAttempts(count)
        `)
        .order('CreatedAt', { ascending: false })
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return (data ?? []).map((r) => this.mapRow(r));
      })
    );
  }

  getExamQuestions(examId: number): Observable<AdminExamQuestionDto[]> {
    return from(
      supabase
        .from('ExamQuestions')
        .select('Id, QuestionType, QuestionText, PassageText, OptionsJson, CorrectAnswer, Explanation, OrderIndex')
        .eq('ExamId', examId)
        .order('OrderIndex', { ascending: true })
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return (data ?? []).map((r) => ({
          id: r['Id'] as number,
          questionType: r['QuestionType'] as string,
          questionText: (r['QuestionText'] as string | null) ?? null,
          passageText: (r['PassageText'] as string | null) ?? null,
          optionsJson: (r['OptionsJson'] as string[]) ?? [],
          correctAnswer: r['CorrectAnswer'] as string,
          explanation: (r['Explanation'] as string | null) ?? null,
          orderIndex: (r['OrderIndex'] as number) ?? 0
        }));
      })
    );
  }

  setPublic(id: number, isPublic: boolean): Observable<void> {
    return from(supabase.from('Exams').update({ IsPublic: isPublic }).eq('Id', id)).pipe(
      map(({ error }) => { if (error) throw error; })
    );
  }

  softDelete(id: number): Observable<void> {
    return from(
      supabase.from('Exams').update({ IsDeleted: true, DeletedAt: new Date().toISOString() }).eq('Id', id)
    ).pipe(map(({ error }) => { if (error) throw error; }));
  }

  restore(id: number): Observable<void> {
    return from(
      supabase.from('Exams').update({ IsDeleted: false, DeletedAt: null }).eq('Id', id)
    ).pipe(map(({ error }) => { if (error) throw error; }));
  }

  /** Permanent delete — admin cleanup only. */
  hardDelete(id: number): Observable<void> {
    return from(supabase.from('Exams').delete().eq('Id', id)).pipe(
      map(({ error }) => { if (error) throw error; })
    );
  }

  private mapRow(r: Record<string, unknown>): AdminExamDto {
    const creator = r['Users'] as { Username: string; FullName: string | null } | null;
    const qCount = (r['ExamQuestions'] as Array<{ count: number }> | null)?.[0]?.count ?? 0;
    const aCount = (r['ExamAttempts'] as Array<{ count: number }> | null)?.[0]?.count ?? 0;
    return {
      id: r['Id'] as number,
      creatorId: r['CreatorId'] as number,
      creatorName: creator?.FullName ?? creator?.Username ?? 'Không rõ',
      title: r['Title'] as string,
      description: (r['Description'] as string | null) ?? null,
      jlptLevel: (r['JlptLevel'] as number | null) ?? null,
      timeLimitInSeconds: (r['TimeLimitInSeconds'] as number | null) ?? null,
      isPublic: (r['IsPublic'] as boolean) ?? false,
      isDeleted: (r['IsDeleted'] as boolean) ?? false,
      createdAt: r['CreatedAt'] as string,
      questionCount: qCount,
      attemptCount: aCount
    };
  }
}
