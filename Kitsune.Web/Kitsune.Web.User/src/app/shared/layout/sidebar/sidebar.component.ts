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
  icon: string;
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
    { id: 1, label: 'Tổng quan', icon: 'home', route: '/home', matchPrefixes: ['/home'] },
    { id: 2, label: 'Tra cứu', icon: 'search', route: '/vocabulary', matchPrefixes: ['/vocabulary', '/kanji'] },
    { id: 3, label: 'Học tập', icon: 'book', route: '/topics', matchPrefixes: ['/topics', '/grammar', '/minigames'] },
    { id: 4, label: 'Ôn tập', icon: 'refresh', route: '/srs', matchPrefixes: ['/srs'] },
    { id: 5, label: 'Quizzes', icon: 'quiz', route: '/quizzes', matchPrefixes: ['/quizzes'] },
    { id: 6, label: 'Cộng đồng', icon: 'users', route: '/leaderboard', matchPrefixes: ['/leaderboard', '/posts', '/messages'] },
  ];

  readonly utilityNavItems: NavItem[] = [
    { id: 7, label: 'Nâng cấp', icon: 'crown', route: '/profile', matchPrefixes: [] },
    { id: 8, label: 'Cài đặt', icon: 'settings', route: '/profile', matchPrefixes: ['/profile'] },
  ];

  ngOnInit(): void {
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe((event) => this.currentUrl.set(event.urlAfterRedirects));
  }

  svgIcon(name: string): string {
    const icons: Record<string, string> = {
      home: '<path d="m3 10 9-7 9 7v10a2 2 0 0 1-2 2h-4v-6H9v6H5a2 2 0 0 1-2-2V10Z"/>',
      search: '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.25 4.25"/>',
      book: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v17H6.5A2.5 2.5 0 0 0 4 22.5v-17Z"/><path d="M4 20a2.5 2.5 0 0 1 2.5-2.5H20"/><path d="M10 7h6M10 11h6"/>',
      refresh: '<path d="M20 11a8 8 0 0 0-14.9-4L3 10"/><path d="M3 4v6h6"/><path d="M4 13a8 8 0 0 0 14.9 4L21 14"/><path d="M21 20v-6h-6"/>',
      quiz: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h2M8 16h2M14 12h2M14 16h2"/>',
      users: '<circle cx="9" cy="8" r="3"/><path d="M3 20v-1.5A4.5 4.5 0 0 1 7.5 14h3a4.5 4.5 0 0 1 4.5 4.5V20"/><path d="M16 5.5a3 3 0 0 1 0 5.8M19 20v-1.5a4.5 4.5 0 0 0-2.2-3.9"/>',
      crown: '<path d="m3 7 4 4 5-7 5 7 4-4-2 12H5L3 7Z"/><path d="M5 22h14"/>',
      settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.1 2.1-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5v.2h-3v-.2a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1-2.1-2.1.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H5v-3h.2a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1 2.1-2.1.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.5V4h3v.2a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1 2.1 2.1-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.5 1h.2v3h-.2a1.7 1.7 0 0 0-1.5 1Z"/>',
    };
    return icons[name] ?? '';
  }

  isActive(item: NavItem): boolean {
    return item.matchPrefixes.some((prefix) => this.currentUrl().startsWith(prefix));
  }
}
