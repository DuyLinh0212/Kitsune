import { Injectable } from '@angular/core';
import { from, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { supabase } from '../supabase/supabase.client';

export interface AdminPostDto {
  id: number;
  userId: number;
  userName: string;
  title: string;
  content: string;
  imageUrls: string[];
  likesCount: number;
  commentsCount: number;
  isHidden: boolean;
  createdAt: string;
}

export interface AdminCommentDto {
  id: number;
  postId: number;
  userId: number;
  userName: string;
  content: string;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class AdminPostService {
  getAllPosts(): Observable<AdminPostDto[]> {
    return from(
      supabase
        .from('Posts')
        .select('Id, UserId, Title, Content, ImageUrls, CreatedAt, Users:UserId(Username, FullName), PostLikes:PostLikes(count), PostComments:Comments(count)')
        .order('CreatedAt', { ascending: false })
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return (data ?? []).map((r) => this.mapPostRow(r));
      })
    );
  }

  getPostComments(postId: number): Observable<AdminCommentDto[]> {
    return from(
      supabase
        .from('PostComments')
        .select('Id, PostId, UserId, Content, CreatedAt, Users:UserId(Username, FullName)')
        .eq('PostId', postId)
        .order('CreatedAt', { ascending: false })
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return (data ?? []).map((r) => {
          const user = r['Users'] as unknown as { Username: string; FullName: string | null } | null;
          return {
            id: r['Id'] as number,
            postId: r['PostId'] as number,
            userId: r['UserId'] as number,
            userName: user?.FullName ?? user?.Username ?? 'Unknown',
            content: r['Content'] as string,
            createdAt: r['CreatedAt'] as string
          };
        });
      })
    );
  }

  hidePost(postId: number): Observable<void> {
    return from(supabase.from('Posts').update({ IsHidden: true }).eq('Id', postId)).pipe(
      map(({ error }) => { if (error) throw error; })
    );
  }

  unhidePost(postId: number): Observable<void> {
    return from(supabase.from('Posts').update({ IsHidden: false }).eq('Id', postId)).pipe(
      map(({ error }) => { if (error) throw error; })
    );
  }

  deletePost(postId: number): Observable<void> {
    return from(supabase.from('Posts').delete().eq('Id', postId)).pipe(
      map(({ error }) => { if (error) throw error; })
    );
  }

  deleteComment(commentId: number): Observable<void> {
    return from(supabase.from('PostComments').delete().eq('Id', commentId)).pipe(
      map(({ error }) => { if (error) throw error; })
    );
  }

  private mapPostRow(r: Record<string, unknown>): AdminPostDto {
    const user = r['Users'] as unknown as { Username: string; FullName: string | null } | null;
    const likes = r['PostLikes'] as Array<{ count: number }> | null;
    const comments = r['PostComments'] as Array<{ count: number }> | null;

    return {
      id: r['Id'] as number,
      userId: r['UserId'] as number,
      userName: user?.FullName ?? user?.Username ?? 'Unknown',
      title: r['Title'] as string,
      content: r['Content'] as string,
      imageUrls: (r['ImageUrls'] as string[]) ?? [],
      likesCount: likes?.[0]?.count ?? 0,
      commentsCount: comments?.[0]?.count ?? 0,
      isHidden: (r['IsHidden'] as boolean) ?? false,
      createdAt: r['CreatedAt'] as string
    };
  }
}
