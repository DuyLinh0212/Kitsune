import { Component, computed, DestroyRef, inject, input, OnInit, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, NavigationEnd, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';

import { ThemeService } from '../../../core/services/theme.service';
import { UserStatsService } from '../../../core/services/user-stats.service';

export interface NavItem {
  id: number;
  label: string;
  iconAsset: string;
  route: string;
  matchPrefixes: string[];
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css',
})
export class SidebarComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly userStatsService = inject(UserStatsService);
  public readonly themeService = inject(ThemeService);

  readonly collapsed = input.required<boolean>();
  readonly navClick = output<void>();
  readonly currentUrl = signal(this.router.url || '/home');
  readonly streak = computed(() => this.userStatsService.stats().streak);
  readonly totalXP = computed(() => this.userStatsService.stats().totalXP);

  readonly primaryNavItems: NavItem[] = [
    { id: 1, label: 'Tổng quan', iconAsset: '/images/navigation/house.png', route: '/home', matchPrefixes: ['/home'] },
    { id: 2, label: 'Tra cứu', iconAsset: '/images/navigation/research.png', route: '/vocabulary', matchPrefixes: ['/vocabulary', '/kanji'] },
    { id: 3, label: 'Học tập', iconAsset: '/images/navigation/reading-book.png', route: '/topics', matchPrefixes: ['/topics', '/grammar', '/minigames'] },
    { id: 4, label: 'Ôn tập', iconAsset: '/images/navigation/brain.png', route: '/srs', matchPrefixes: ['/srs'] },
    { id: 5, label: 'Quizzes', iconAsset: '/images/navigation/test.png', route: '/quizzes', matchPrefixes: ['/quizzes', '/my-quizzes', '/quiz-create'] },
    { id: 6, label: 'Đề kiểm tra', iconAsset: '/images/navigation/manual.png', route: '/exams', matchPrefixes: ['/exams'] },
    { id: 7, label: 'Cộng đồng', iconAsset: '/images/navigation/instagram-post.png', route: '/posts', matchPrefixes: ['/posts', '/messages'] },
  ];

  readonly utilityNavItems: NavItem[] = [
    { id: 8, label: 'Bảng xếp hạng', iconAsset: '/images/navigation/podium.png', route: '/leaderboard', matchPrefixes: ['/leaderboard'] },
    { id: 9, label: 'Minigame', iconAsset: '/images/navigation/console.png', route: '/minigames', matchPrefixes: ['/minigames'] },
  ];

  ngOnInit(): void {
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe((event) => this.currentUrl.set(event.urlAfterRedirects));
  }

  isActive(item: NavItem): boolean {
    return item.matchPrefixes.some((prefix) => this.currentUrl().startsWith(prefix));
  }
}
