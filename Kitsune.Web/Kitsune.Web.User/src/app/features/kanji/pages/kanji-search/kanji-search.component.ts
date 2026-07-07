import { Component, inject, signal, OnInit, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { KanjiUserService, KanjiDetailDto } from '../../../../core/services/kanji-user.service';
import { FolderService, FolderDto } from '../../../../core/services/folder.service';
import { KanjiStrokeWriterComponent } from '../../components/kanji-stroke-writer/kanji-stroke-writer.component';

@Component({
  selector: 'app-kanji-search',
  standalone: true,
  imports: [CommonModule, FormsModule, KanjiStrokeWriterComponent],
  templateUrl: './kanji-search.component.html',
  styleUrl: './kanji-search.component.css',
})
export class KanjiSearchComponent implements OnInit {
  private readonly kanjiService = inject(KanjiUserService);
  private readonly folderService = inject(FolderService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly searchSubject = new Subject<string>();

  readonly searchQuery = signal('');
  readonly kanjis = signal<KanjiDetailDto[]>([]);
  readonly selectedKanji = signal<KanjiDetailDto | null>(null);
  readonly isSearching = signal(false);
  readonly isLoadingDetail = signal(false);
  readonly isRandomMode = signal(true);
  readonly autoOpenCharacter = signal<string | null>(null);

  // Folder
  readonly folders = signal<FolderDto[]>([]);
  readonly showFolderModal = signal(false);
  readonly isLoadingFolders = signal(false);
  readonly isAddingToFolder = signal(false);
  readonly newFolderName = signal('');

  readonly toast = signal<{ type: 'success' | 'error'; message: string } | null>(null);

  ngOnInit(): void {
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
    if (q) this.doSearch(q);
  }

  private doSearch(q: string): void {
    this.isSearching.set(true);
    this.kanjiService.search(q, 40).subscribe({
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

  // --- Folder ---
  openFolderModal(): void {
    this.showFolderModal.set(true);
    this.newFolderName.set('');
    if (this.folders().length === 0) this.loadFolders();
  }

  closeFolderModal(): void {
    this.showFolderModal.set(false);
  }

  loadFolders(): void {
    this.isLoadingFolders.set(true);
    this.folderService.getFolders().subscribe({
      next: (folders) => {
        this.folders.set(folders);
        this.isLoadingFolders.set(false);
      },
      error: () => this.isLoadingFolders.set(false),
    });
  }

  createFolder(): void {
    const name = this.newFolderName().trim();
    if (!name) return;
    this.folderService.create({ name }).subscribe({
      next: (folder) => {
        this.folders.update((f) => [folder, ...f]);
        this.newFolderName.set('');
        this.showToast('success', `Đã tạo thư mục "${folder.name}"`);
      },
      error: () => this.showToast('error', 'Không thể tạo thư mục'),
    });
  }

  addKanjiToFolder(folderId: number, folderName: string): void {
    const kanji = this.selectedKanji();
    if (!kanji || this.isAddingToFolder()) return;
    this.isAddingToFolder.set(true);
    // Thêm kanji vào folder bằng cách tạo 1 vocabulary entry từ kanji
    this.folderService.addVocabularyCopy(
      folderId,
      kanji.character,
      kanji.onyomi ?? kanji.kunyomi ?? null,
      `${kanji.meaning} (${kanji.amHanViet})`,
      1, // Japanese language ID
      kanji.id
    ).subscribe({
      next: () => {
        this.isAddingToFolder.set(false);
        this.closeFolderModal();
        this.folderService.triggerVocabAdded(folderId);
        this.showToast('success', `Đã thêm "${kanji.character}" vào thư mục "${folderName}"`);
      },
      error: () => {
        this.isAddingToFolder.set(false);
        this.showToast('error', 'Không thể thêm Kanji vào thư mục');
      },
    });
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
