import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, from } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '../supabase/supabase.client';
import { AuthService } from './auth.service';

export interface NotificationDto {
  id: number;
  userId: number;
  type: 'comment_reply' | 'post_comment' | 'quiz_attempt' | 'system';
  title: string;
  message: string;
  relatedPostId: string | null;
  relatedCommentId: number | null;
  relatedUserId: number | null;
  isRead: boolean;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly supabase: SupabaseClient = supabase;
  private readonly authService = inject(AuthService);
  private readonly _notifications$ = new BehaviorSubject<NotificationDto[]>([]);
  readonly notifications$ = this._notifications$.asObservable();
  private readonly _unreadCount$ = new BehaviorSubject<number>(0);
  readonly unreadCount$ = this._unreadCount$.asObservable();
  private channel: ReturnType<typeof supabase.channel> | null = null;

  loadNotifications(): Observable<NotificationDto[]> {
    return from(this.getCurrentUserId()).pipe(
      switchMap((userId) =>
        from(
          this.supabase
            .from('Notification')
            .select('Id, UserId, Type, Title, Message, RelatedPostId, RelatedCommentId, RelatedUserId, IsRead, CreatedAt')
            .eq('UserId', userId)
            .order('CreatedAt', { ascending: false })
            .limit(50)
        )
      ),
      map(({ data, error }) => {
        if (error) throw error;
        const list = ((data ?? []) as Array<{
          Id: number; UserId: number; Type: NotificationDto['type'];
          Title: string; Message: string; RelatedPostId: string | null;
          RelatedCommentId: number | null; RelatedUserId: number | null;
          IsRead: boolean; CreatedAt: string;
        }>).map(r => ({
          id: r.Id, userId: r.UserId, type: r.Type,
          title: r.Title, message: r.Message,
          relatedPostId: r.RelatedPostId, relatedCommentId: r.RelatedCommentId,
          relatedUserId: r.RelatedUserId, isRead: r.IsRead, createdAt: r.CreatedAt,
        }));
        this._notifications$.next(list);
        this._unreadCount$.next(list.filter((n) => !n.isRead).length);
        return list;
      })
    );
  }

  subscribeRealtime(): void {
    if (this.channel) return; // already subscribed
    this.getCurrentUserId().then((userId) => {
      this.channel = this.supabase
        .channel(`notifications:user=${userId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'Notification',
            filter: `UserId=eq.${userId}`,
          },
          (payload) => {
            const r = payload.new as {
              Id: number; UserId: number; Type: NotificationDto['type'];
              Title: string; Message: string; RelatedPostId: string | null;
              RelatedCommentId: number | null; RelatedUserId: number | null;
              IsRead: boolean; CreatedAt: string;
            };
            const newNotif: NotificationDto = {
              id: r.Id, userId: r.UserId, type: r.Type,
              title: r.Title, message: r.Message,
              relatedPostId: r.RelatedPostId, relatedCommentId: r.RelatedCommentId,
              relatedUserId: r.RelatedUserId, isRead: r.IsRead, createdAt: r.CreatedAt,
            };
            this._notifications$.next([newNotif, ...this._notifications$.getValue()]);
            if (!newNotif.isRead) {
              this._unreadCount$.next(this._unreadCount$.getValue() + 1);
            }
          }
        )
        .subscribe();
    });
  }

  markAsRead(id: number): Observable<void> {
    return from(this.getCurrentUserId()).pipe(
      switchMap((userId) =>
        from(
          this.supabase
            .from('Notification')
            .update({ IsRead: true })
            .eq('Id', id)
            .eq('UserId', userId)
        )
      ),
      map(({ error }) => {
        if (error) throw error;
        this._notifications$.next(
          this._notifications$.getValue().map((n) => (n.id === id ? { ...n, isRead: true } : n))
        );
        this._unreadCount$.next(Math.max(0, this._unreadCount$.getValue() - 1));
      })
    );
  }

  markAllAsRead(): Observable<void> {
    return from(this.getCurrentUserId()).pipe(
      switchMap((userId) =>
        from(
          this.supabase
            .from('Notification')
            .update({ IsRead: true })
            .eq('UserId', userId)
            .eq('IsRead', false)
        )
      ),
      map(({ error }) => {
        if (error) throw error;
        this._notifications$.next(
          this._notifications$.getValue().map((n) => ({ ...n, isRead: true }))
        );
        this._unreadCount$.next(0);
      })
    );
  }

  disconnect(): void {
    if (this.channel) {
      this.supabase.removeChannel(this.channel);
      this.channel = null;
    }
  }

  async createNotification(dto: {
    userId: number; type: NotificationDto['type'];
    title: string; message: string;
    relatedPostId?: string | null; relatedCommentId?: number | null; relatedUserId?: number | null;
  }): Promise<void> {
    await this.supabase.from('Notification').insert({
      UserId: dto.userId, Type: dto.type,
      Title: dto.title, Message: dto.message,
      RelatedPostId: dto.relatedPostId ?? null,
      RelatedCommentId: dto.relatedCommentId ?? null,
      RelatedUserId: dto.relatedUserId ?? null,
      IsRead: false,
    });
  }

  async notifyPostAuthor(
    postAuthorId: number, postId: string, commentId: number, commenterName: string
  ): Promise<void> {
    await this.createNotification({
      userId: postAuthorId, type: 'post_comment',
      title: 'Bình luận mới',
      message: `${commenterName} đã bình luận về bài viết của bạn`,
      relatedPostId: postId, relatedCommentId: commentId,
    });
  }

  async notifyCommentReply(
    commentAuthorId: number, postId: string, commentId: number, replierName: string
  ): Promise<void> {
    await this.createNotification({
      userId: commentAuthorId, type: 'comment_reply',
      title: 'Trả lời bình luận',
      message: `${replierName} đã trả lời bình luận của bạn`,
      relatedPostId: postId, relatedCommentId: commentId,
    });
  }

  private async getCurrentUserId(): Promise<number> {
    const { data: authData } = await this.supabase.auth.getUser();
    if (!authData.user?.email) throw new Error('Not authenticated');
    const { data: profile } = await this.supabase
      .from('Users')
      .select('Id')
      .eq('Email', authData.user.email)
      .maybeSingle();
    if (!profile) throw new Error('User profile not found');
    return (profile as { Id: number }).Id;
  }
}
