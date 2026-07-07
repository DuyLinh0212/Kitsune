import { Injectable } from '@angular/core';
import { from, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { supabase } from '../supabase/supabase.client';

export interface AdminConversationDto {
  userId: number;
  username: string;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
}

export interface AdminMessageDto {
  id: number;
  senderId: number;
  senderName: string;
  content: string;
  isRead: boolean;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class AdminMessageService {
  getConversations(): Observable<AdminConversationDto[]> {
    return from(
      supabase
        .from('Messages')
        .select('SenderId, ReceiverId, Content, CreatedAt, IsRead, Users:Users!Messages_SenderId_fkey(Username)')
        .eq('ReceiverId', 1)
        .order('CreatedAt', { ascending: false })
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        const map = new Map<number, AdminConversationDto>();
        for (const r of data ?? []) {
          const senderId = r['SenderId'] as number;
          const existing = map.get(senderId);
          const sender = r['Users'] as unknown as { Username: string } | null;
          const unread = (!r['IsRead'] && senderId !== 1) ? 1 : 0;
          if (!existing) {
            map.set(senderId, {
              userId: senderId,
              username: sender?.Username ?? 'Unknown',
              lastMessage: r['Content'] as string,
              lastMessageAt: r['CreatedAt'] as string,
              unreadCount: unread
            });
          }
        }
        return Array.from(map.values());
      })
    );
  }

  getMessages(userId: number): Observable<AdminMessageDto[]> {
    return from(
      supabase
        .from('Messages')
        .select('Id, SenderId, ReceiverId, Content, IsRead, CreatedAt, Users:SenderId(Username)')
        .or(`and(SenderId.eq.${userId},ReceiverId.eq.1),and(SenderId.eq.1,ReceiverId.eq.${userId})`)
        .order('CreatedAt', { ascending: true })
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return (data ?? []).map((r) => {
          const sender = r['Users'] as unknown as { Username: string } | null;
          return {
            id: r['Id'] as number,
            senderId: r['SenderId'] as number,
            senderName: sender?.Username ?? 'Unknown',
            content: r['Content'] as string,
            isRead: r['IsRead'] as boolean,
            createdAt: r['CreatedAt'] as string
          };
        });
      })
    );
  }

  sendMessage(receiverId: number, content: string): Observable<void> {
    return from(
      supabase.from('Messages').insert({ SenderId: 1, ReceiverId: receiverId, Content: content })
    ).pipe(
      map(({ error }) => { if (error) throw error; })
    );
  }

  markAsRead(messageIds: number[]): Observable<void> {
    return from(
      supabase.from('Messages').update({ IsRead: true }).in('Id', messageIds)
    ).pipe(
      map(({ error }) => { if (error) throw error; })
    );
  }
}
