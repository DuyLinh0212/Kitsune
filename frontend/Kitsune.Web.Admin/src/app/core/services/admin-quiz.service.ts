import { Injectable } from '@angular/core';
import { from, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { supabase } from '../supabase/supabase.client';

export interface AdminQuizDto {
  id: number;
  creatorId: number;
  creatorName: string;
  quizModeId: number;
  modeName: string;
  title: string;
  description: string | null;
  timeLimitInSeconds: number;
  isPublic: boolean;
  createdAt: string;
  questionCount: number;
  attemptCount: number;
}

export interface AdminQuizQuestionDto {
  id: number;
  quizId: number;
  vocabularyId: number | null;
  questionText: string;
  optionsJson: string[];
  correctAnswer: string;
  orderIndex: number;
}

@Injectable({ providedIn: 'root' })
export class AdminQuizService {
  getAllQuizzes(): Observable<AdminQuizDto[]> {
    return from(
      supabase
        .from('Quizzes')
        .select(`
          Id, CreatorId, QuizModeId, Title, Description, TimeLimitInSeconds, IsPublic, CreatedAt,
          QuizModes:QuizModeId(ModeName),
          Users:CreatorId(Username, FullName),
          QuizQuestions:QuizQuestions(count),
          QuizAttempts:QuizAttempts(count)
        `)
        .order('CreatedAt', { ascending: false })
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return (data ?? []).map((r) => this.mapQuizRow(r));
      })
    );
  }

  getQuizQuestions(quizId: number): Observable<AdminQuizQuestionDto[]> {
    return from(
      supabase
        .from('QuizQuestions')
        .select('Id, QuizId, VocabularyId, QuestionText, OptionsJson, CorrectAnswer, OrderIndex')
        .eq('QuizId', quizId)
        .order('OrderIndex')
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return (data ?? []).map((r) => ({
          id: r['Id'] as number,
          quizId: r['QuizId'] as number,
          vocabularyId: (r['VocabularyId'] as number | null) ?? null,
          questionText: r['QuestionText'] as string,
          optionsJson: r['OptionsJson'] as string[],
          correctAnswer: r['CorrectAnswer'] as string,
          orderIndex: r['OrderIndex'] as number
        }));
      })
    );
  }

  deleteQuiz(id: number): Observable<void> {
    return from(supabase.from('Quizzes').delete().eq('Id', id)).pipe(
      map(({ error }) => {
        if (error) throw error;
      })
    );
  }

  togglePublic(id: number, isPublic: boolean): Observable<void> {
    return from(supabase.from('Quizzes').update({ IsPublic: isPublic }).eq('Id', id)).pipe(
      map(({ error }) => {
        if (error) throw error;
      })
    );
  }

  private mapQuizRow(r: Record<string, unknown>): AdminQuizDto {
    const mode = r['QuizModes'] as { ModeName: string } | null;
    const creator = r['Users'] as { Username: string; FullName: string | null } | null;
    const qCount = (r['QuizQuestions'] as Array<{ count: number }> | null)?.[0]?.count ?? 0;
    const aCount = (r['QuizAttempts'] as Array<{ count: number }> | null)?.[0]?.count ?? 0;

    return {
      id: r['Id'] as number,
      creatorId: r['CreatorId'] as number,
      creatorName: creator?.FullName ?? creator?.Username ?? 'Unknown',
      quizModeId: r['QuizModeId'] as number,
      modeName: mode?.ModeName ?? '',
      title: r['Title'] as string,
      description: (r['Description'] as string | null) ?? null,
      timeLimitInSeconds: r['TimeLimitInSeconds'] as number,
      isPublic: (r['IsPublic'] as boolean) ?? false,
      createdAt: r['CreatedAt'] as string,
      questionCount: qCount,
      attemptCount: aCount
    };
  }
}
