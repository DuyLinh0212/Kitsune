import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { AuthService } from '../../../../core/services/auth.service';
import { UserProfile } from '../../../../core/models/auth.model';
import { UserStatsService } from '../../../../core/services/user-stats.service';
import { UsageTrackingService } from '../../../../core/services/usage-tracking.service';
import { LoadingFoxComponent } from '../../../../shared/components/loading-fox/loading-fox.component';

@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [CommonModule, LoadingFoxComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
})
export class HomeComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly userStatsService = inject(UserStatsService);
  private readonly usageTrackingService = inject(UsageTrackingService);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly router = inject(Router);

  readonly currentUser = signal<UserProfile | null>(this.authService.getStoredUser());
  readonly isLoading = signal(true);
  readonly weeklyHours = signal<number[]>([0, 0, 0, 0, 0, 0, 0]);
  readonly dailyTarget = 12;

  readonly streak = computed(() => this.userStatsService.stats().streak);
  readonly totalXP = computed(() => this.userStatsService.stats().totalXP);
  readonly srsCardsDue = computed(() => this.userStatsService.stats().srsCardsDue);
  readonly completedToday = computed(() => Math.min(this.dailyTarget, this.userStatsService.stats().todayReviewed));
  readonly dailyProgress = computed(() => Math.round((this.completedToday() / this.dailyTarget) * 100));
  readonly maxWeekValue = computed(() => Math.max(...this.weeklyHours(), .25));
  readonly totalWeekHours = computed(() => this.weeklyHours().reduce((sum, value) => sum + value, 0));

  ngOnInit(): void {
    this.authService.currentUser$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((user) => {
      this.currentUser.set(user);
    });

    this.weeklyHours.set(this.usageTrackingService.getWeekHours());
    this.isLoading.set(false);
  }

  get displayName(): string {
    const user = this.currentUser();
    return user?.fullName || user?.username || 'bạn';
  }

  get hasReviewReady(): boolean {
    return this.srsCardsDue() > 0;
  }

  get nextActionLabel(): string {
    return this.hasReviewReady ? 'Vào phiên ôn tập' : 'Khám phá bài học';
  }

  get nextActionRoute(): string {
    return this.hasReviewReady ? '/srs' : '/topics';
  }

  formatWeekDuration(hours: number): string {
    const minutes = Math.max(0, Math.round(hours * 60));
    if (minutes < 60) return `${minutes}p`;
    return `${Number((minutes / 60).toFixed(1))}h`;
  }

  getBarHeight(hours: number): number {
    return Math.max(8, Math.round((hours / this.maxWeekValue()) * 100));
  }

  getDayLabel(index: number): string {
    const labels = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    return labels[date.getDay()];
  }
}
