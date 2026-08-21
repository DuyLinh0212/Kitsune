import { Component, inject, signal, OnInit, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { KanjiUserService, KanjiDetailDto } from '../../../../core/services/kanji-user.service';
import { KanjiStrokeWriterComponent } from '../../components/kanji-stroke-writer/kanji-stroke-writer.component';
import { CommentSectionComponent } from '../../../../shared/components/comment-section/comment-section.component';
import { LookupFrameComponent } from '../../../../shared/components/lookup-frame/lookup-frame.component';

@Component({
  selector: 'app-kanji-search',
  standalone: true,
  imports: [CommonModule, FormsModule, KanjiStrokeWriterComponent, CommentSectionComponent, LookupFrameComponent],
  templateUrl: './kanji-search.component.html',
  styleUrl: './kanji-search.component.css',
})
export class KanjiSearchComponent implements OnInit {
  private readonly kanjiService = inject(KanjiUserService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly searchSubject = new Subject<string>();

  readonly searchQuery = signal('');
  readonly kanjis = signal<KanjiDetailDto[]>([]);
  readonly selectedKanji = signal<KanjiDetailDto | null>(null);
  
  // Radicals
  readonly radicals = signal<{ id: number; character: string; name: string }[]>([]);
  readonly selectedRadicalId = signal<number | null>(null);
  readonly showRadicalPopover = signal(false);
  readonly radicalSearchQuery = signal('');

  readonly isSearching = signal(false);
  readonly isLoadingDetail = signal(false);
  readonly isRandomMode = signal(true);
  readonly autoOpenCharacter = signal<string | null>(null);

  readonly toast = signal<{ type: 'success' | 'error'; message: string } | null>(null);

  // Computed values for template
  get filteredRadicals() {
    const q = this.radicalSearchQuery().trim().toLowerCase();
    if (!q) return this.radicals();
    return this.radicals().filter(r => 
      r.character.includes(q) || r.name.toLowerCase().includes(q)
    );
  }

  get selectedRadical() {
    const id = this.selectedRadicalId();
    if (!id) return null;
    return this.radicals().find(r => r.id === id) || null;
  }

  ngOnInit(): void {
    this.loadRadicals();
    this.loadRandom();
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const character = params.get('character')?.trim() ?? '';
      const kanjiId = Number(params.get('id'));
      if (character) {
        this.autoOpenCharacter.set(character);
        this.searchQuery.set(character);
        this.isRandomMode.set(false);
        this.doSearch(character.trim());
        return;
      }

      if (Number.isFinite(kanjiId) && kanjiId > 0) {
        this.kanjiService.getById(kanjiId).subscribe({
          next: (kanji) => {
            this.autoOpenCharacter.set(kanji.character);
            this.searchQuery.set(kanji.character);
            this.isRandomMode.set(false);
            this.kanjis.set([kanji]);
            this.selectKanji(kanji);
          },
        });
      }
    });

    this.searchSubject
      .pipe(debounceTime(350), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((query) => {
        if (query.trim()) {
          this.isRandomMode.set(false);
          this.doSearch(query.trim());
        } else {
          this.isRandomMode.set(true);
          this.loadRandom();
        }
      });
  }

  private loadRadicals(): void {
    this.kanjiService.getAllRadicals().subscribe({
      next: (data) => this.radicals.set(data),
      error: () => this.showToast('error', 'Không thể tải danh sách bộ thủ'),
    });
  }

  private loadRandom(): void {
    this.isSearching.set(true);
    this.kanjiService.getRandom(40).subscribe({
      next: (results) => {
        if (results.length > 0) {
          this.kanjis.set(results);
          this.isSearching.set(false);
          this.selectKanji(results[0]);
        } else {
          // Random offset exceeded table size — fallback to first page
          this.kanjiService.getFirst(40).subscribe({
            next: (fallback) => {
              this.kanjis.set(fallback);
              this.isSearching.set(false);
              if (fallback.length > 0) this.selectKanji(fallback[0]);
            },
            error: () => {
              this.isSearching.set(false);
              this.showToast('error', 'Không thể tải danh sách Kanji');
            },
          });
        }
      },
      error: () => {
        this.isSearching.set(false);
        this.showToast('error', 'Không thể tải danh sách Kanji');
      },
    });
  }

  onSearchInput(value: string): void {
    this.searchQuery.set(value);
    this.searchSubject.next(value);
  }

  onSearchEnter(): void {
    const q = this.searchQuery().trim();
    if (q || this.selectedRadicalId()) this.doSearch(q);
  }

  selectRadical(radicalId: number): void {
    if (this.selectedRadicalId() === radicalId) {
      this.selectedRadicalId.set(null); // Toggle off
    } else {
      this.selectedRadicalId.set(radicalId);
    }
    this.showRadicalPopover.set(false);
    
    const q = this.searchQuery().trim();
    if (q || this.selectedRadicalId()) {
      this.isRandomMode.set(false);
      this.doSearch(q);
    } else {
      this.isRandomMode.set(true);
      this.loadRandom();
    }
  }

  toggleRadicalPopover(): void {
    this.showRadicalPopover.update(v => !v);
    if (this.showRadicalPopover()) {
      this.radicalSearchQuery.set('');
    }
  }

  clearRadicalFilter(event: Event): void {
    event.stopPropagation();
    this.selectedRadicalId.set(null);
    this.showRadicalPopover.set(false);
    
    const q = this.searchQuery().trim();
    if (q) {
      this.doSearch(q);
    } else {
      this.isRandomMode.set(true);
      this.loadRandom();
    }
  }

  private doSearch(q: string): void {
    this.isSearching.set(true);
    const radicalId = this.selectedRadicalId() ?? undefined;
    this.kanjiService.search(q, 40, radicalId).subscribe({
      next: (results) => {
        this.kanjis.set(results);
        this.isSearching.set(false);
        if (results.length > 0) {
          this.selectKanji(results[0]);
          if (this.autoOpenCharacter() && results.length > 1) {
            const exact = results.find((item) => item.character === this.autoOpenCharacter());
            if (exact) this.selectKanji(exact);
          }
        } else {
          this.selectedKanji.set(null);
        }
      },
      error: (err) => {
        this.isSearching.set(false);
        this.kanjis.set([]);
        const msg = (err as { message?: string })?.message ?? '';
        this.showToast('error', `Lỗi tìm kiếm: ${msg || 'Không thể kết nối CSDL'}`);
      },
    });
  }

  selectKanji(kanji: KanjiDetailDto): void {
    this.selectedKanji.set(kanji);
  }

  toggleBookmark(): void {
    const kanji = this.selectedKanji();
    if (!kanji) return;
    this.showToast('success', `Đã lưu "${kanji.character}" vào yêu thích!`);
  }

  getJlptColor(level: number | null): string {
    const colors: Record<number, string> = {
      1: '#dc2626',
      2: '#d97706',
      3: '#16a34a',
      4: '#2563eb',
      5: '#7c3aed',
    };
    return level ? (colors[level] ?? '#6b7280') : '#6b7280';
  }

  private showToast(type: 'success' | 'error', message: string): void {
    this.toast.set({ type, message });
    setTimeout(() => this.toast.set(null), 3000);
  }
}
