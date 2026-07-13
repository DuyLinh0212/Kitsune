import { Component, inject, signal, OnInit, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { VocabularyService, VocabularyDto } from '../../../../core/services/vocabulary.service';
import { FolderService, FolderDto } from '../../../../core/services/folder.service';
import { KanjiUserService, KanjiDetailDto } from '../../../../core/services/kanji-user.service';
import { TtsService } from '../../../../core/services/tts.service';
import { LoadingFoxComponent } from '../../../../shared/components/loading-fox/loading-fox.component';

@Component({
  selector: 'app-vocabulary-search',
  standalone: true,
  imports: [CommonModule, FormsModule, LoadingFoxComponent],
  templateUrl: './vocabulary-search.component.html',
  styleUrl: './vocabulary-search.component.css',
})
export class VocabularySearchComponent implements OnInit {
  private readonly vocabularyService = inject(VocabularyService);
  private readonly folderService = inject(FolderService);
  private readonly kanjiService = inject(KanjiUserService);
  readonly ttsService = inject(TtsService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly searchSubject = new Subject<string>();

  // Dữ liệu
  readonly searchQuery = signal('');
  readonly searchResults = signal<VocabularyDto[]>([]);
  readonly selectedVocab = signal<VocabularyDto | null>(null);
  readonly folders = signal<FolderDto[]>([]);
  readonly selectedKanji = signal<KanjiDetailDto | null>(null);
  readonly newFolderName = signal('');

  // Trạng thái loading
  readonly isSearching = signal(false);
  readonly isLoadingFolders = signal(false);
  readonly isLoadingKanji = signal(false);
  readonly isAddingToFolder = signal(false);
  readonly isTogglingBookmark = signal(false);

  // Trạng thái tính năng
  readonly isBookmarked = signal(false);
  readonly showKanjiModal = signal(false);
  readonly showFolderModal = signal(false);

  // Thông báo toast
  readonly toast = signal<{ type: 'success' | 'error'; message: string } | null>(null);

  readonly isRandomMode = signal(true);

  ngOnInit(): void {
    this.loadFolders();
    
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const word = params.get('word')?.trim() ?? '';
      if (word) {
        this.searchQuery.set(word);
        this.isRandomMode.set(false);
        this.doSearch(word);
      } else {
        this.loadRandom();
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
    this.vocabularyService.getRandom(20).subscribe({
      next: (results) => {
        this.searchResults.set(results);
        this.isSearching.set(false);
        if (results.length > 0) this.selectVocab(results[0]);
      },
      error: () => this.isSearching.set(false),
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
    this.vocabularyService.searchGlobal(q, 30).subscribe({
      next: (results) => {
        this.searchResults.set(results);
        this.isSearching.set(false);
        if (results.length > 0) {
          this.selectVocab(results[0]);
        } else {
          this.selectedVocab.set(null);
          this.isBookmarked.set(false);
        }
      },
      error: (err) => {
        this.isSearching.set(false);
        this.searchResults.set([]);
        const msg = (err as { message?: string })?.message ?? '';
        this.showToast('error', `Lỗi tìm kiếm: ${msg || 'Không thể kết nối CSDL'}`);
      },
    });
  }

  selectVocab(vocab: VocabularyDto): void {
    this.selectedVocab.set(vocab);
    this.closeKanjiModal();
    this.loadVocabStatus(vocab.id);
  }

  private loadVocabStatus(vocabId: number): void {
    this.isBookmarked.set(false);
    this.vocabularyService.getBookmarkStatus(vocabId).subscribe({
      next: (status) => this.isBookmarked.set(status),
    });
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

  // --- Folder ---
  openFolderModal(): void {
    this.showFolderModal.set(true);
    this.newFolderName.set('');
  }

  closeFolderModal(): void {
    this.showFolderModal.set(false);
  }

  createFolder(): void {
    const name = this.newFolderName().trim();
    if (!name) return;
    this.folderService.create({ name }).subscribe({
      next: (folder) => {
        this.folders.update((f) => [folder, ...f]);
        this.newFolderName.set('');
        this.showFolderModal.set(false);
        this.showToast('success', `Đã tạo thư mục "${folder.name}"`);
      },
      error: () => this.showToast('error', 'Không thể tạo thư mục'),
    });
  }

  addToFolder(folderId: number, folderName: string): void {
    const vocab = this.selectedVocab();
    if (!vocab || this.isAddingToFolder()) return;
    this.isAddingToFolder.set(true);
    this.folderService.addVocabulary(folderId, vocab.id).subscribe({
      next: () => {
        this.isAddingToFolder.set(false);
        this.closeFolderModal();
        this.folderService.triggerVocabAdded(folderId);
        this.showToast('success', `Đã thêm vào thư mục "${folderName}"`);
      },
      error: () => {
        // Vocab belongs to another user → copy it into the folder instead
        this.folderService.addVocabularyCopy(
          folderId,
          vocab.word,
          vocab.pronunciation,
          vocab.meaning,
          vocab.languageId
        ).subscribe({
          next: () => {
            this.isAddingToFolder.set(false);
            this.closeFolderModal();
            this.folderService.triggerVocabAdded(folderId);
            this.showToast('success', `Đã sao chép "${vocab.word}" vào thư mục "${folderName}"`);
          },
          error: () => {
            this.isAddingToFolder.set(false);
            this.showToast('error', 'Không thể thêm vào thư mục');
          },
        });
      },
    });
  }

  speakWord(vocab: VocabularyDto): void {
    this.ttsService.speak(vocab.word);
  }

  // --- Bookmark (Yêu thích) ---
  toggleBookmark(): void {
    const vocab = this.selectedVocab();
    if (!vocab || this.isTogglingBookmark()) return;
    this.isTogglingBookmark.set(true);
    this.vocabularyService.toggleBookmark(vocab.id).subscribe({
      next: (isNowPinned) => {
        this.isBookmarked.set(isNowPinned);
        this.isTogglingBookmark.set(false);
        this.showToast('success', isNowPinned ? 'Đã thêm vào yêu thích ♥' : 'Đã xóa khỏi yêu thích');
      },
      error: () => {
        this.isTogglingBookmark.set(false);
        this.showToast('error', 'Không thể cập nhật yêu thích');
      },
    });
  }

  // --- Kanji Detail ---
  openKanjiDetail(kanjiId: number): void {
    this.showKanjiModal.set(true);
    this.selectedKanji.set(null);
    this.isLoadingKanji.set(true);
    this.kanjiService.getById(kanjiId).subscribe({
      next: (kanji) => {
        this.selectedKanji.set(kanji);
        this.isLoadingKanji.set(false);
      },
      error: () => {
        this.isLoadingKanji.set(false);
        this.showToast('error', 'Không thể tải thông tin Kanji');
      },
    });
  }

  closeKanjiModal(): void {
    this.showKanjiModal.set(false);
    this.selectedKanji.set(null);
  }

  // --- Helpers ---
  getSpecificDataEntries(vocab: VocabularyDto): { label: string; value: string }[] {
    if (!vocab.specificData) return [];
    const labelMap: Record<string, string> = {
      jlptLevel: 'JLPT',
      partOfSpeech: 'Từ loại',
      exampleSentence: 'Ví dụ',
      example: 'Ví dụ',
      notes: 'Ghi chú',
      level: 'Cấp độ',
      type: 'Loại từ',
    };
    return Object.entries(vocab.specificData)
      .filter(([, v]) => v !== null && v !== undefined && String(v).trim() !== '')
      .map(([k, v]) => ({
        label: labelMap[k] ?? k,
        value: String(v),
      }));
  }

  getJlptColor(level: number | null): string {
    const colors: Record<number, string> = {
      1: '#dc2626',
      2: '#d97706',
      3: '#16a34a',
      4: '#2563eb',
      5: '#7c3aed',
    };
    return level ? colors[level] ?? '#6b7280' : '#6b7280';
  }

  private showToast(type: 'success' | 'error', message: string): void {
    this.toast.set({ type, message });
    setTimeout(() => this.toast.set(null), 3000);
  }
}
