import {
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  inject,
  input,
  OnInit,
  output,
  signal,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NavigationEnd, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';

import { AuthService } from '../../../core/services/auth.service';
import { UserProfile } from '../../../core/models/auth.model';
import { supabase } from '../../../core/supabase/supabase.client';
import { NotificationBellComponent } from './notification-bell/notification-bell.component';

type LocalSearchKind = 'post' | 'quiz' | 'vocabulary' | 'kanji';

interface LocalSearchResult {
  id: string | number;
  kind: LocalSearchKind;
  title: string;
  subtitle: string;
}

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, FormsModule, NotificationBellComponent],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css',
})
export class HeaderComponent implements OnInit {
  @ViewChild('globalSearchInput') private searchInput?: ElementRef<HTMLInputElement>;

  readonly router = inject(Router);
  readonly authService = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  readonly sidebarCollapsed = input.required<boolean>();
  readonly toggleSidebar = output<void>();
  readonly currentUrl = signal('/home');
  readonly currentUser = signal<UserProfile | null>(this.authService.getStoredUser());
  readonly searchQuery = signal('');
  readonly searchResults = signal<LocalSearchResult[]>([]);
  readonly isSearching = signal(false);
  readonly searchOpen = signal(false);
  readonly dueSrsCount = signal(0);
  readonly userMenuOpen = signal(false);
  private searchTimer: ReturnType<typeof setTimeout> | null = null;
  private searchRequestId = 0;

  ngOnInit(): void {
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe((event) => this.currentUrl.set(event.urlAfterRedirects));

    this.authService.currentUser$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((user) => {
      this.currentUser.set(user);
    });

    void this.loadDueSrsCount();
    this.destroyRef.onDestroy(() => {
      if (this.searchTimer) clearTimeout(this.searchTimer);
    });
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
    return true;
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

  onSearchInput(value: string): void {
    this.searchQuery.set(value);
    this.searchOpen.set(true);
    if (this.searchTimer) clearTimeout(this.searchTimer);
    const requestId = ++this.searchRequestId;

    const query = value.trim();
    if (query.length < 2) {
      this.searchResults.set([]);
      this.isSearching.set(false);
      return;
    }

    this.searchTimer = setTimeout(() => {
      void this.performLocalSearch(query, requestId);
    }, 260);
  }

  onSearch(): void {
    const query = this.searchQuery().trim();
    if (!query) return;

    const firstResult = this.searchResults()[0];
    if (firstResult) {
      this.openSearchResult(firstResult);
      return;
    }

    this.finishSearchNavigation(['/vocabulary'], { word: query });
  }

  openSearchResult(result: LocalSearchResult): void {
    if (result.kind === 'post') {
      this.finishSearchNavigation(['/posts', result.id]);
      return;
    }
    if (result.kind === 'quiz') {
      this.finishSearchNavigation(['/quizzes', result.id]);
      return;
    }
    if (result.kind === 'kanji') {
      this.finishSearchNavigation(['/kanji'], { character: result.title });
      return;
    }
    this.finishSearchNavigation(['/vocabulary'], { word: result.title });
  }

  closeSearchSoon(): void {
    setTimeout(() => this.searchOpen.set(false), 120);
  }

  getSearchKindLabel(kind: LocalSearchKind): string {
    const labels: Record<LocalSearchKind, string> = {
      post: 'Bài viết',
      quiz: 'Quiz',
      vocabulary: 'Từ vựng',
      kanji: 'Kanji',
    };
    return labels[kind];
  }

  getSearchKindIcon(kind: LocalSearchKind): string {
    const icons: Record<LocalSearchKind, string> = {
      post: '✦',
      quiz: 'Q',
      vocabulary: '語',
      kanji: '漢',
    };
    return icons[kind];
  }

  @HostListener('document:keydown', ['$event'])
  handleSearchShortcut(event: KeyboardEvent): void {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      this.searchOpen.set(true);
      this.searchInput?.nativeElement.focus();
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

  private async performLocalSearch(query: string, requestId: number): Promise<void> {
    const safeQuery = query.replace(/[,%_()]/g, ' ').replace(/\s+/g, ' ').trim();
    if (!safeQuery) return;

    this.isSearching.set(true);
    const pattern = `%${safeQuery}%`;
    const [postsResult, quizzesResult, vocabulariesResult, kanjiResult] = await Promise.all([
      supabase
        .from('Posts')
        .select('Id, Title, Content')
        .or(`Title.ilike.${pattern},Content.ilike.${pattern}`)
        .order('CreatedAt', { ascending: false })
        .limit(4),
      supabase
        .from('Quizzes')
        .select('Id, Title, Description')
        .eq('IsPublic', true)
        .or(`Title.ilike.${pattern},Description.ilike.${pattern}`)
        .limit(4),
      supabase
        .from('Vocabularies')
        .select('Id, Word, Meaning, Pronunciation')
        .or(`Word.ilike.${pattern},Meaning.ilike.${pattern},Pronunciation.ilike.${pattern}`)
        .limit(5),
      supabase
        .from('Kanji')
        .select('Id, Character, Meaning, AmHanViet, Onyomi, Kunyomi')
        .or(
          `Character.ilike.${pattern},Meaning.ilike.${pattern},AmHanViet.ilike.${pattern},Onyomi.ilike.${pattern},Kunyomi.ilike.${pattern}`,
        )
        .limit(5),
    ]);

    if (requestId !== this.searchRequestId) return;

    if (postsResult.error) console.warn('Local post search failed', postsResult.error);
    if (quizzesResult.error) console.warn('Local quiz search failed', quizzesResult.error);
    if (vocabulariesResult.error) console.warn('Local vocabulary search failed', vocabulariesResult.error);
    if (kanjiResult.error) console.warn('Local kanji search failed', kanjiResult.error);

    const posts: LocalSearchResult[] = (postsResult.data ?? []).map((row) => ({
      id: row.Id as string,
      kind: 'post',
      title: row.Title as string,
      subtitle: this.toSearchPreview((row.Content as string | null) ?? 'Bài viết cộng đồng'),
    }));
    const quizzes: LocalSearchResult[] = (quizzesResult.data ?? []).map((row) => ({
      id: row.Id as number,
      kind: 'quiz',
      title: row.Title as string,
      subtitle: this.toSearchPreview(this.parseQuizDescription(row.Description as string | null)),
    }));
    const vocabularies: LocalSearchResult[] = (vocabulariesResult.data ?? []).map((row) => ({
      id: row.Id as number,
      kind: 'vocabulary',
      title: row.Word as string,
      subtitle: [row.Pronunciation as string | null, row.Meaning as string | null]
        .filter(Boolean)
        .join(' · '),
    }));
    const kanjis: LocalSearchResult[] = (kanjiResult.data ?? []).map((row) => ({
      id: row.Id as number,
      kind: 'kanji',
      title: row.Character as string,
      subtitle: [row.AmHanViet as string | null, row.Meaning as string | null]
        .filter(Boolean)
        .join(' · '),
    }));

    this.searchResults.set([...posts, ...quizzes, ...vocabularies, ...kanjis]);
    this.isSearching.set(false);
  }

  private finishSearchNavigation(commands: readonly unknown[], queryParams?: Record<string, string>): void {
    this.searchRequestId += 1;
    this.searchOpen.set(false);
    this.searchQuery.set('');
    this.searchResults.set([]);
    void this.router.navigate(commands, queryParams ? { queryParams } : undefined);
  }

  private parseQuizDescription(raw: string | null): string {
    if (!raw) return 'Quiz cộng đồng';
    try {
      const parsed = JSON.parse(raw) as { userDescription?: string | null };
      return parsed.userDescription?.trim() || 'Quiz cộng đồng';
    } catch {
      return raw;
    }
  }

  private toSearchPreview(value: string): string {
    const normalized = value.replace(/\s+/g, ' ').trim();
    return normalized.length > 84 ? `${normalized.slice(0, 81)}…` : normalized;
  }
}
