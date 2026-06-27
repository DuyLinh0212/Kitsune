import { Component, input, output, inject, signal, OnInit } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { filter } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { UserProfile } from '../../../core/models/auth.model';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css'
})
export class HeaderComponent implements OnInit {
  readonly router = inject(Router);
  readonly authService = inject(AuthService);
  readonly currentUrl = signal('/home');
  readonly currentUser = signal<UserProfile | null>(this.authService.getStoredUser());
  readonly searchQuery = signal('');

  ngOnInit(): void {
    this.router.events.pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd)).subscribe((e) => {
      this.currentUrl.set(e.urlAfterRedirects);
    });
  }

  readonly sidebarCollapsed = input.required<boolean>();
  readonly toggleSidebar = output<void>();
  readonly toggleUserMenu = output<void>();
  readonly userMenuOpen = input.required<boolean>();

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

  logout(): void {
    this.authService.logout().subscribe({
      complete: () => this.router.navigate(['/login']),
    });
  }
}
