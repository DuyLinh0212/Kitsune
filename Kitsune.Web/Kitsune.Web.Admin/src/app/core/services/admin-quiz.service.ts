import { Injectable } from '@angular/core';
import { from, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { supabase } from '../supabase/supabase.client';

// ✅ Schema: Quizzes(Id, CreatorId, Title, Description, TimeLimitInSeconds, CreatedAt)
// QuizQuestions(Id, QuizId, QuestionText, OptionsJson, CorrectAnswer)
export interface AdminQuizDto {
  id: number;
  creatorId: number;
  creatorName: string;
  title: string;
  description: string | null;
  timeLimitInSeconds: number;
  createdAt: string;
  questionCount: number;
  attemptCount: number;
}

export interface AdminQuizQuestionDto {
  id: number;
  quizId: number;
  questionText: string;
  optionsJson: string[];
  correctAnswer: string;
}

@Injectable({ providedIn: 'root' })
export class AdminQuizService {
  getAllQuizzes(): Observable<AdminQuizDto[]> {
    return from(
      supabase
        .from('Quizzes')
        .select(`
          Id, CreatorId, Title, Description, TimeLimitInSeconds, CreatedAt,
          Users:CreatorId(Username, FullName),
          QuizQuestions(count),
          QuizAttempts(count)
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
        .select('Id, QuizId, QuestionText, OptionsJson, CorrectAnswer')
        .eq('QuizId', quizId)
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return (data ?? []).map((r) => ({
          id: r['Id'] as number,
          quizId: r['QuizId'] as number,
          questionText: r['QuestionText'] as string,
          optionsJson: (r['OptionsJson'] as string[]) ?? [],
          correctAnswer: r['CorrectAnswer'] as string,
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

  private mapQuizRow(r: Record<string, unknown>): AdminQuizDto {
    const creator = r['Users'] as { Username: string; FullName: string | null } | null;
    const qCount = (r['QuizQuestions'] as Array<{ count: number }> | null)?.[0]?.count ?? 0;
    const aCount = (r['QuizAttempts'] as Array<{ count: number }> | null)?.[0]?.count ?? 0;

    // Description encodes {modes, userDescription, vocabIds, kanjiIds} — extract readable part
    let userDescription: string | null = null;
    const rawDesc = r['Description'] as string | null;
    if (rawDesc) {
      try {
        const parsed = JSON.parse(rawDesc) as { userDescription?: string | null };
        userDescription = parsed.userDescription ?? null;
      } catch {
        userDescription = rawDesc;
      }
    }

    return {
      id: r['Id'] as number,
      creatorId: r['CreatorId'] as number,
      creatorName: creator?.FullName ?? creator?.Username ?? 'Unknown',
      title: r['Title'] as string,
      description: userDescription,
      timeLimitInSeconds: (r['TimeLimitInSeconds'] as number) ?? 0,
      createdAt: r['CreatedAt'] as string,
      questionCount: qCount,
      attemptCount: aCount
    };
  }
}
