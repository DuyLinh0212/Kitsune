// frontend/Kitsune.Web.User/src/app/features/profile/pages/profile/profile.component.ts
import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { from, forkJoin } from 'rxjs';
import { AuthService } from '../../../../core/services/auth.service';
import { UserProfile } from '../../../../core/models/auth.model';
import { supabase } from '../../../../core/supabase/supabase.client';
import { SrsService, SrsStatsOverview } from '../../../../core/services/srs.service';
import { UserStatsService } from '../../../../core/services/user-stats.service';
import { ThemeService } from '../../../../core/services/theme.service';

type Tab = 'info' | 'avatar' | 'folders' | 'srs' | 'settings';

interface ProfileStats {
  vocabCount: number;
  kanjiCount: number;
  quizCount: number;
}

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.css',
})
export class ProfileComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly srsService = inject(SrsService);
  readonly userStatsService = inject(UserStatsService);
  readonly themeService = inject(ThemeService);

  readonly userProfile = signal<UserProfile | null>(null);
  readonly stats = signal<ProfileStats>({ vocabCount: 0, kanjiCount: 0, quizCount: 0 });
  readonly activeTab = signal<Tab>('info');
  readonly editFullName = signal('');
  readonly isSaving = signal(false);
  readonly isLoadingStats = signal(true);
  readonly toast = signal<{ message: string; type: 'success' | 'error' } | null>(null);
  readonly showTermsModal = signal(false);

  readonly srsStats = signal<SrsStatsOverview | null>(null);
  readonly isLoadingSrsStats = signal(false);
  readonly maxBoxCount = computed(() => {
    const stats = this.srsStats();
    if (!stats) return 1;
    return Math.max(1, ...stats.boxLevels.map((b) => b.count));
  });
  readonly maxTrendTotal = computed(() => {
    const stats = this.srsStats();
    if (!stats) return 1;
    return Math.max(1, ...stats.accuracyTrend.map((p) => p.total));
  });
  readonly totalSrsCards = computed(() => {
    const stats = this.srsStats();
    if (!stats) return 0;
    return stats.boxLevels.reduce((sum, b) => sum + b.count, 0);
  });

  // Avatar upload
  readonly avatarPreview = signal<string | null>(null);
  readonly isUploadingAvatar = signal(false);
  private readonly avatarInput = signal<HTMLInputElement | null>(null);

  get displayName(): string {
    const u = this.userProfile();
    return u?.fullName || u?.username || 'Người dùng';
  }

  get username(): string {
    return this.userProfile()?.username || 'user';
  }

  get initials(): string {
    const name = this.displayName;
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? 'U';
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  readonly avatarUrl = computed(() => {
    const profile = this.userProfile();
    return profile?.avatarUrl ?? null;
  });

  readonly tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'info', label: 'Thông tin', icon: '👤' },
    { id: 'avatar', label: 'Ảnh đại diện', icon: '🖼️' },
    { id: 'folders', label: 'Thư mục', icon: '📁' },
    { id: 'srs', label: 'Thống kê', icon: '📊' },
    { id: 'settings', label: 'Cài đặt', icon: '⚙️' },
  ];

  ngOnInit(): void {
    const user = this.authService.getStoredUser();
    if (user) {
      this.userProfile.set(user);
      this.editFullName.set(user.fullName || '');
      if (user.avatarUrl) {
        this.avatarPreview.set(user.avatarUrl);
      }
      this.fetchStats(user.id);
    }
  }

  setTab(tab: Tab): void {
    this.activeTab.set(tab);
    if (tab === 'srs' && !this.srsStats() && !this.isLoadingSrsStats()) {
      this.loadSrsStats();
    }
  }

  private loadSrsStats(): void {
    this.isLoadingSrsStats.set(true);
    this.srsService.getStatsOverview().subscribe({
      next: (overview) => {
        this.srsStats.set(overview);
        this.isLoadingSrsStats.set(false);
      },
      error: () => {
        this.isLoadingSrsStats.set(false);
      },
    });
  }

  barHeight(count: number, max: number): number {
    return Math.max(4, Math.round((count / max) * 100));
  }

  formatShortDate(dateStr: string): string {
    const d = new Date(dateStr);
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
  }

  // ── Avatar Upload ──────────────────────────────────────────────────────

  onAvatarClick(): void {
    this.avatarInput.set(document.createElement('input') as HTMLInputElement);
    const input = this.avatarInput()!;
    input.type = 'file';
    input.accept = 'image/*';
    input.style.display = 'none';
    input.onchange = () => {
      if (input.files?.[0]) {
        this.uploadAvatar(input.files[0]);
      }
      input.remove();
    };
    document.body.appendChild(input);
    input.click();
  }

  private async uploadAvatar(file: File): Promise<void> {
    this.isUploadingAvatar.set(true);
    try {
      const userId = await this.getCurrentUserId();
      const ext = file.name.split('.').pop() ?? 'png';
      const path = `avatars/${userId}-${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage.from('avatars').upload(path, file, {
        cacheControl: '3600',
        upsert: true,
      });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
      const publicUrl = urlData.publicUrl;

      const { error: updateError } = await supabase
        .from('Users')
        .update({ AvatarUrl: publicUrl })
        .eq('Id', userId);

      if (updateError) throw updateError;

      this.userProfile.update((u) => (u ? { ...u, avatarUrl: publicUrl } : u));
      this.avatarPreview.set(publicUrl);
      this.showToast('Cập nhật ảnh đại diện thành công!', 'success');
    } catch {
      this.showToast('Không thể tải ảnh lên. Vui lòng thử lại.', 'error');
    } finally {
      this.isUploadingAvatar.set(false);
    }
  }

  async removeAvatar(): Promise<void> {
    const confirmed = confirm('Bạn có chắc muốn xóa ảnh đại diện?');
    if (!confirmed) return;

    this.isUploadingAvatar.set(true);
    try {
      const userId = await this.getCurrentUserId();
      const { error } = await supabase
        .from('Users')
        .update({ AvatarUrl: null })
        .eq('Id', userId);

      if (error) throw error;

      this.userProfile.update((u) => (u ? { ...u, avatarUrl: null } : u));
      this.avatarPreview.set(null);
      this.showToast('Đã xóa ảnh đại diện', 'success');
    } catch {
      this.showToast('Không thể xóa ảnh', 'error');
    } finally {
      this.isUploadingAvatar.set(false);
    }
  }

  // ── Profile Info ───────────────────────────────────────────────────────

  saveFullName(): void {
    const newName = this.editFullName().trim();
    if (!newName) {
      this.showToast('Vui lòng nhập họ và tên', 'error');
      return;
    }
    this.isSaving.set(true);
    this.authService.updateProfile({ fullName: newName }).subscribe({
      next: () => {
        this.showToast('Cập nhật thành công!', 'success');
        this.isSaving.set(false);
      },
      error: () => {
        this.showToast('Lỗi kết nối', 'error');
        this.isSaving.set(false);
      },
    });
  }

  onEditFullName(value: string): void {
    this.editFullName.set(value);
  }

  // ── Stats ──────────────────────────────────────────────────────────────

  private fetchStats(userId: number): void {
    this.isLoadingStats.set(true);

    const vocab$ = from(
      supabase
        .from('SRSCards')
        .select('Id', { count: 'exact', head: true })
        .eq('UserId', userId)
        .not('VocabularyId', 'is', null)
    );

    const kanji$ = from(
      supabase
        .from('SRSCards')
        .select('Id', { count: 'exact', head: true })
        .eq('UserId', userId)
        .not('KanjiId', 'is', null)
    );

    const quiz$ = from(
      supabase
        .from('QuizAttempts')
        .select('Id', { count: 'exact', head: true })
        .eq('UserId', userId)
    );

    forkJoin([vocab$, kanji$, quiz$]).subscribe({
      next: ([vocabRes, kanjiRes, quizRes]) => {
        this.stats.set({
          vocabCount: vocabRes.count ?? 0,
          kanjiCount: kanjiRes.count ?? 0,
          quizCount: quizRes.count ?? 0,
        });
        this.isLoadingStats.set(false);
      },
      error: () => {
        this.isLoadingStats.set(false);
      },
    });
  }

  // ── Navigation ─────────────────────────────────────────────────────────

  goToFolders(): void {
    this.router.navigate(['/folders']);
  }

  // ── Helpers ────────────────────────────────────────────────────────────

  logout(): void {
    this.authService.logout().subscribe({
      complete: () => (window.location.href = '/login'),
    });
  }

  formatDate(dateStr: string | null): string {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }

  private showToast(message: string, type: 'success' | 'error'): void {
    this.toast.set({ message, type });
    setTimeout(() => this.toast.set(null), 3000);
  }

  private async getCurrentUserId(): Promise<number> {
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user?.email) throw new Error('Not authenticated');
    const { data: profile } = await supabase
      .from('Users')
      .select('Id')
      .eq('Email', authData.user.email)
      .maybeSingle();
    if (!profile) throw new Error('User profile not found');
    return (profile as { Id: number }).Id;
  }
}
