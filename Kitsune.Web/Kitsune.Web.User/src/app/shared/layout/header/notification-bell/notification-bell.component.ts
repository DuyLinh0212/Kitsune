// frontend/Kitsune.Web.User/src/app/shared/layout/header/notification-bell/notification-bell.component.ts
import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { NotificationService, NotificationDto } from '../../../../core/services/notification.service';
import { AuthService } from '../../../../core/services/auth.service';
import { supabase } from '../../../../core/supabase/supabase.client';

// Synthetic (non-DB) SRS reminder shown at the top of the notification list
const SRS_NOTIF_ID = -9999;

@Component({
  selector: 'app-notification-bell',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notification-bell.component.html',
  styleUrl: './notification-bell.component.css',
})
export class NotificationBellComponent implements OnInit {
  private readonly notificationService = inject(NotificationService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly isOpen = signal(false);
  readonly notifications = signal<NotificationDto[]>([]);
  readonly unreadCount = signal(0);
  readonly isLoading = signal(false);
  private sub: Subscription | null = null;
  private srsDueCount = 0;

  ngOnInit(): void {
    this.loadNotifications();
    this.notificationService.subscribeRealtime();
    this.sub = this.notificationService.unreadCount$.subscribe((c) => {
      this.unreadCount.set(c + (this.srsDueCount > 0 ? 1 : 0));
    });
    void this.checkSrsDue();
  }

  private async checkSrsDue(): Promise<void> {
    try {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user?.email) return;
      const { data: profile } = await supabase
        .from('Users')
        .select('Id')
        .eq('Email', authData.user.email)
        .maybeSingle();
      if (!profile) return;
      const userId = (profile as { Id: number }).Id;
      const now = new Date().toISOString();
      const { count } = await supabase
        .from('SRSCards')
        .select('Id', { count: 'exact', head: true })
        .eq('UserId', userId)
        .lte('NextReviewDate', now);
      this.srsDueCount = count ?? 0;
      if (this.srsDueCount > 0) {
        const srsNotif: NotificationDto = {
          id: SRS_NOTIF_ID,
          userId,
          type: 'system',
          title: `📚 ${this.srsDueCount} thẻ SRS cần ôn tập!`,
          message: `Bạn có ${this.srsDueCount} thẻ từ vựng đến hạn ôn tập hôm nay. Hãy ôn ngay!`,
          relatedPostId: null,
          relatedCommentId: null,
          relatedUserId: null,
          isRead: false,
          createdAt: new Date().toISOString(),
        };
        const current = this.notifications();
        const withoutSrs = current.filter((n) => n.id !== SRS_NOTIF_ID);
        this.notifications.set([srsNotif, ...withoutSrs]);
        this.unreadCount.update((c) => c + 1);
      }
    } catch {
      // silently ignore
    }
  }

  toggle(): void {
    this.isOpen.update((v) => !v);
    if (this.isOpen() && this.notifications().length === 0) {
      this.loadNotifications();
    }
  }

  close(): void {
    this.isOpen.set(false);
  }

  private loadNotifications(): void {
    this.isLoading.set(true);
    this.notificationService.loadNotifications().subscribe({
      next: (list) => {
        const filtered = list.filter((n) => n.id !== SRS_NOTIF_ID);
        if (this.srsDueCount > 0) {
          const srsNotif = this.notifications().find((n) => n.id === SRS_NOTIF_ID);
          if (srsNotif) {
            this.notifications.set([srsNotif, ...filtered]);
          } else {
            this.notifications.set(filtered);
          }
        } else {
          this.notifications.set(filtered);
        }
        this.unreadCount.set(list.filter((n) => !n.isRead).length + (this.srsDueCount > 0 ? 1 : 0));
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      },
    });
  }

  markAsRead(notif: NotificationDto): void {
    if (notif.id === SRS_NOTIF_ID) {
      this.srsDueCount = 0;
      this.notifications.update((list) => list.filter((n) => n.id !== SRS_NOTIF_ID));
      this.unreadCount.update((c) => Math.max(0, c - 1));
      this.router.navigate(['/srs']);
      this.isOpen.set(false);
      return;
    }
    if (notif.isRead) return;
    this.notificationService.markAsRead(notif.id).subscribe();
    this.notifications.update((list) =>
      list.map((n) => (n.id === notif.id ? { ...n, isRead: true } : n))
    );
    this.unreadCount.update((c) => Math.max(0, c - 1));
  }

  markAllAsRead(): void {
    this.notificationService.markAllAsRead().subscribe();
    this.srsDueCount = 0;
    this.notifications.update((list) =>
      list.filter((n) => n.id !== SRS_NOTIF_ID).map((n) => ({ ...n, isRead: true }))
    );
    this.unreadCount.set(0);
  }

  goToRelated(notif: NotificationDto): void {
    this.isOpen.set(false);
    if (notif.id === SRS_NOTIF_ID) {
      this.router.navigate(['/srs']);
      return;
    }
    if (notif.relatedPostId) {
      this.router.navigate(['/posts', notif.relatedPostId]);
    }
  }

  getIcon(type: string): string {
    switch (type) {
      case 'comment_reply': return '💬';
      case 'post_comment': return '📝';
      case 'quiz_attempt': return '🎯';
      case 'system': return '📚';
      default: return '🔔';
    }
  }

  formatTime(dateStr: string): string {
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return dateStr;
    return d.toLocaleString('vi-VN', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }
}
