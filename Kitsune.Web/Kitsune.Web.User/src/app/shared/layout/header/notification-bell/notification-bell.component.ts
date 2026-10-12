// frontend/Kitsune.Web.User/src/app/shared/layout/header/notification-bell/notification-bell.component.ts
import { Component, DestroyRef, HostListener, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NotificationService, NotificationDto } from '../../../../core/services/notification.service';
import { SrsService } from '../../../../core/services/srs.service';
import { LoadingFoxComponent } from '../../../components/loading-fox/loading-fox.component';

// Synthetic (non-DB) SRS reminder shown at the top of the notification list
const SRS_NOTIF_ID = -9999;

@Component({
  selector: 'app-notification-bell',
  standalone: true,
  imports: [CommonModule, LoadingFoxComponent],
  templateUrl: './notification-bell.component.html',
  styleUrl: './notification-bell.component.css',
})
export class NotificationBellComponent implements OnInit {
  private readonly notificationService = inject(NotificationService);
  private readonly srsService = inject(SrsService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly isOpen = signal(false);
  readonly notifications = signal<NotificationDto[]>([]);
  readonly unreadCount = signal(0);
  readonly isLoading = signal(false);
  private srsDueCount = 0;
  private latestSrsDueCount = 0;
  private dismissedSrsDueCount: number | null = null;

  ngOnInit(): void {
    this.loadNotifications();
    this.notificationService.subscribeRealtime();
    this.notificationService.unreadCount$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((c) => {
      this.unreadCount.set(c + (this.srsDueCount > 0 ? 1 : 0));
    });
    void this.checkSrsDue();
  }

  @HostListener('window:kitsune:srs-due-changed')
  refreshSrsDue(): void {
    void this.checkSrsDue();
  }

  private async checkSrsDue(): Promise<void> {
    try {
      const dueSummary = await this.srsService.getGlobalDueSummary();
      if (!dueSummary) return;

      const { userId, dueCount } = dueSummary;
      const previousDueCount = this.srsDueCount;
      this.latestSrsDueCount = dueCount;
      if (dueCount === 0) this.dismissedSrsDueCount = null;
      this.srsDueCount = dueCount > 0 && this.dismissedSrsDueCount !== dueCount ? dueCount : 0;
      const current = this.notifications();
      const existingSrsNotification = current.find(
        (notification) => notification.id === SRS_NOTIF_ID,
      );
      const withoutSrs = current.filter((notification) => notification.id !== SRS_NOTIF_ID);

      if (this.srsDueCount > 0) {
        const srsNotif: NotificationDto = {
          id: SRS_NOTIF_ID,
          userId,
          type: 'system',
          title: `📚 ${this.srsDueCount} thẻ SRS cần ôn tập!`,
          message: `Bạn có ${this.srsDueCount} thẻ đến hạn ôn tập hôm nay. Hãy ôn ngay!`,
          relatedPostId: null,
          relatedCommentId: null,
          relatedUserId: null,
          isRead: false,
          createdAt: existingSrsNotification?.createdAt ?? new Date().toISOString(),
        };
        this.notifications.set([srsNotif, ...withoutSrs]);
        if (previousDueCount === 0) this.unreadCount.update((count) => count + 1);
      } else {
        this.notifications.set(withoutSrs);
        if (previousDueCount > 0) {
          this.unreadCount.update((count) => Math.max(0, count - 1));
        }
      }
    } catch {
      // silently ignore
    }
  }

  toggle(): void {
    this.isOpen.update((v) => !v);
    if (this.isOpen()) void this.checkSrsDue();
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
      this.dismissedSrsDueCount = this.latestSrsDueCount;
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
    this.dismissedSrsDueCount = this.latestSrsDueCount;
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
