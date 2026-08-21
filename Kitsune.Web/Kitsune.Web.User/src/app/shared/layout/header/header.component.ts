import { Component, DestroyRef, inject, input, OnInit, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NavigationEnd, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';

import { AuthService } from '../../../core/services/auth.service';
import { UserProfile } from '../../../core/models/auth.model';
import { supabase } from '../../../core/supabase/supabase.client';
import { NotificationBellComponent } from './notification-bell/notification-bell.component';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, FormsModule, NotificationBellComponent],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css',
})
export class HeaderComponent implements OnInit {
  readonly router = inject(Router);
  readonly authService = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  readonly sidebarCollapsed = input.required<boolean>();
  readonly toggleSidebar = output<void>();
  readonly currentUrl = signal('/home');
  readonly currentUser = signal<UserProfile | null>(this.authService.getStoredUser());
  readonly searchQuery = signal('');
  readonly dueSrsCount = signal(0);
  readonly userMenuOpen = signal(false);

  ngOnInit(): void {
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe((event) => this.currentUrl.set(event.urlAfterRedirects));

    this.authService.currentUser$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((user) => {
      this.currentUser.set(user);
    });

    void this.loadDueSrsCount();
  }

  get pageTitle(): string {
    const url = this.currentUrl();
    if (url.startsWith('/vocabulary') || url.startsWith('/kanji')) return 'Tra cứu';
    if (url.startsWith('/topics') || url.startsWith('/grammar') || url.startsWith('/minigames')) return 'Học tập';
    if (url.startsWith('/srs')) return 'Ôn tập';
    if (url.startsWith('/quizzes')) return 'Quizzes';
    if (url.startsWith('/exams')) return 'Đề kiểm tra';
    if (url.startsWith('/leaderboard') || url.startsWith('/posts') || url.startsWith('/messages')) return 'Cộng đồng';
    if (url.startsWith('/profile')) return 'Tài khoản';
    return 'Hôm nay';
  }

  get showSearch(): boolean {
    return this.currentUrl() === '/home' || this.currentUrl() === '/home/' || this.currentUrl() === '/';
  }

  get displayName(): string {
    const user = this.currentUser();
    return user?.fullName || user?.username || 'Người học Kitsune';
  }

  get initials(): string {
    const parts = this.displayName.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return 'K';
    if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? 'K';
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }

  get avatarUrl(): string | null {
    return this.currentUser()?.avatarUrl ?? null;
  }

  onSearch(): void {
    const query = this.searchQuery().trim();
    if (query) {
      void this.router.navigate(['/vocabulary'], { queryParams: { q: query } });
    }
  }

  toggleUserMenu(): void {
    this.userMenuOpen.update((open) => !open);
  }

  closeUserMenu(): void {
    this.userMenuOpen.set(false);
  }

  goToProfile(): void {
    this.closeUserMenu();
    void this.router.navigate(['/profile']);
  }

  logout(): void {
    this.authService.logout().subscribe({
      complete: () => { window.location.href = '/login'; },
    });
  }

  private async loadDueSrsCount(): Promise<void> {
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user?.email) return;

    const { data: profile, error: profileError } = await supabase
      .from('Users')
      .select('Id')
      .eq('Email', authData.user.email)
      .maybeSingle();
    if (profileError || !profile) return;

    const { count, error: countError } = await supabase
      .from('SRSCards')
      .select('Id', { count: 'exact', head: true })
      .eq('UserId', (profile as { Id: number }).Id)
      .lte('NextReviewDate', new Date().toISOString());
    if (!countError) this.dueSrsCount.set(count ?? 0);
  }
}
