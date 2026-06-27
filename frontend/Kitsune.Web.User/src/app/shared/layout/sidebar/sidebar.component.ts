import { Component, signal, input, output, inject, OnInit } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { filter } from 'rxjs';

export interface NavItem {
  label: string;
  icon: string;
  route: string;
  matchPrefix?: string;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css'
})
export class SidebarComponent implements OnInit {
  private readonly router = inject(Router);

  readonly collapsed = input.required<boolean>();
  readonly navClick = output<void>();
  readonly currentUrl = signal('/home');

  readonly streak = signal(12);
  readonly totalXP = signal(1280);
  readonly dailyGoal = signal({ current: 8, target: 20 });

  readonly navItems: NavItem[] = [
    { label: 'Home', icon: 'home', route: '/home', matchPrefix: '/home' },
    { label: 'Vocabulary', icon: 'book', route: '/vocabulary', matchPrefix: '/vocabulary' },
    { label: 'Kanji', icon: 'kanji', route: '/kanji', matchPrefix: '/kanji' },
    { label: 'My Folders', icon: 'folder', route: '/folders', matchPrefix: '/folders' },
    { label: 'Quizzes', icon: 'clock', route: '/quizzes', matchPrefix: '/quizzes' },
    { label: 'My Quizzes', icon: 'users', route: '/quizzes', matchPrefix: '/quizzes' },
    { label: 'SRS Review', icon: 'trending-up', route: '/srs', matchPrefix: '/srs' },
    { label: 'Posts', icon: 'message-circle', route: '/posts', matchPrefix: '/posts' },
    { label: 'Leaderboard', icon: 'bar-chart', route: '/leaderboard', matchPrefix: '/leaderboard' },
    { label: 'Messages', icon: 'mail', route: '/messages', matchPrefix: '/messages' },
    { label: 'Profile', icon: 'user', route: '/profile', matchPrefix: '/profile' },
  ];

  ngOnInit(): void {
    this.router.events.pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd)).subscribe((e) => {
      this.currentUrl.set(e.urlAfterRedirects);
    });
  }

  get dailyGoalPercent(): number {
    const { current, target } = this.dailyGoal();
    return target > 0 ? Math.round((current / target) * 100) : 0;
  }

  navigateTo(route: string): void {
    this.router.navigate([route]);
    this.navClick.emit();
  }

  svgIcon(name: string): string {
    const icons: Record<string, string> = {
      home: `<path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>`,
      book: `<path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/>`,
      kanji: `<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>`,
      folder: `<path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/>`,
      clock: `<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>`,
      users: `<path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>`,
      'trending-up': `<polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>`,
      'message-circle': `<path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/>`,
      'bar-chart': `<path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/>`,
      mail: `<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22 6 12 13 2 6"/>`,
      user: `<path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>`,
    };
    return icons[name] ?? '';
  }

  isActive(item: NavItem, currentRoute: string): boolean {
    if (item.matchPrefix) return currentRoute.startsWith(item.matchPrefix);
    return currentRoute === item.route;
  }
}
