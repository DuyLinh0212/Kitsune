import { Injectable } from '@angular/core';
import { from, Observable } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { supabase } from '../supabase/supabase.client';

export interface CommentDto {
  id: number;
  userId: number;
  vocabularyId: number | null;
  kanjiId: number | null;
  content: string;
  createdAt: string;
  authorName: string;
  authorAvatarUrl: string | null;
  isOwn: boolean;
}

@Injectable({ providedIn: 'root' })
export class CommentService {
  getComments(target: { vocabularyId?: number; kanjiId?: number }): Observable<CommentDto[]> {
    return from(this.getCurrentUserId()).pipe(
      switchMap((currentUserId) => {
        let query = supabase
          .from('Comments')
          .select('Id, UserId, VocabularyId, KanjiId, Content, CreatedAt, Users(Username, FullName, AvatarUrl)')
          .order('CreatedAt', { ascending: false });

        query = target.vocabularyId
          ? query.eq('VocabularyId', target.vocabularyId)
          : query.eq('KanjiId', target.kanjiId!);

        return from(query).pipe(
          map(({ data, error }) => {
            if (error) throw error;
            return (data ?? []).map((r: Record<string, unknown>) => this.mapRow(r, currentUserId));
          })
        );
      })
    );
  }

  addComment(content: string, target: { vocabularyId?: number; kanjiId?: number }): Observable<CommentDto> {
    return from(this.getCurrentUserId()).pipe(
      switchMap((userId) =>
        from(
          supabase
            .from('Comments')
            .insert({
              UserId: userId,
              VocabularyId: target.vocabularyId ?? null,
              KanjiId: target.kanjiId ?? null,
              Content: content.trim(),
            })
            .select('Id, UserId, VocabularyId, KanjiId, Content, CreatedAt, Users(Username, FullName, AvatarUrl)')
            .single()
        ).pipe(
          map(({ data, error }) => {
            if (error) throw error;
            return this.mapRow(data, userId);
          })
        )
      )
    );
  }

  deleteComment(id: number): Observable<void> {
    return from(supabase.from('Comments').delete().eq('Id', id)).pipe(
      map(({ error }) => {
        if (error) throw error;
      })
    );
  }

  private async getCurrentUserId(): Promise<number> {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user?.email) throw new Error('Not authenticated');
    const { data: profile, error: pe } = await supabase
      .from('Users')
      .select('Id')
      .eq('Email', data.user.email)
      .maybeSingle();
    if (pe) throw pe;
    if (!profile) throw new Error('User profile not found — please reload the page');
    return (profile as { Id: number }).Id;
  }

  private mapRow(r: Record<string, unknown>, currentUserId: number): CommentDto {
    const author = r['Users'] as { Username?: string; FullName?: string; AvatarUrl?: string | null } | null;
    const userId = r['UserId'] as number;
    return {
      id: r['Id'] as number,
      userId,
      vocabularyId: (r['VocabularyId'] as number | null) ?? null,
      kanjiId: (r['KanjiId'] as number | null) ?? null,
      content: r['Content'] as string,
      createdAt: r['CreatedAt'] as string,
      authorName: author?.FullName || author?.Username || 'Người dùng',
      authorAvatarUrl: author?.AvatarUrl ?? null,
      isOwn: userId === currentUserId,
    };
  }
}
