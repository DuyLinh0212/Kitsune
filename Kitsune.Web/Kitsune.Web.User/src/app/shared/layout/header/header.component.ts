// frontend/Kitsune.Web.User/src/app/shared/layout/header/header.component.ts
import { Component, input, output, inject, signal, OnInit } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
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

  readonly currentUrl = signal('/home');
  readonly currentUser = signal<UserProfile | null>(this.authService.getStoredUser());
  readonly searchQuery = signal('');
  readonly dueSrsCount = signal(0);
  readonly userMenuOpen = signal(false);

  ngOnInit(): void {
    this.router.events.pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd)).subscribe((e) => {
      this.currentUrl.set(e.urlAfterRedirects);
    });
    void this.loadDueSrsCount();
  }

  private async loadDueSrsCount(): Promise<void> {
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user?.email) return;
    const { data: profile } = await supabase.from('Users').select('Id').eq('Email', authData.user.email).maybeSingle();
    if (!profile) return;
    const userId = (profile as { Id: number }).Id;
    const now = new Date().toISOString();
    const { count } = await supabase
      .from('SRSCards')
      .select('Id', { count: 'exact', head: true })
      .eq('UserId', userId)
      .lte('NextReviewDate', now);
    this.dueSrsCount.set(count ?? 0);
  }

  readonly sidebarCollapsed = input.required<boolean>();
  readonly toggleSidebar = output<void>();

  get showSearch(): boolean {
    const url = this.currentUrl();
    return url === '/home' || url === '/home/' || url === '/';
  }

  get displayName(): string {
    const u = this.currentUser();
    return u?.fullName || u?.username || 'Người dùng';
  }

  get initials(): string {
    const name = this.displayName;
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  get avatarUrl(): string | null {
    return this.currentUser()?.avatarUrl ?? null;
  }

  onSearch(): void {
    if (this.searchQuery().trim()) {
      this.router.navigate(['/vocabulary'], { queryParams: { q: this.searchQuery() } });
    }
  }

  toggleUserMenu(): void {
    this.userMenuOpen.update((v) => !v);
  }

  logout(): void {
    this.authService.logout().subscribe({
      complete: () => window.location.href = '/login',
    });
  }
}
