import { CommonModule } from '@angular/common';
import {
  Component,
  DestroyRef,
  OnDestroy,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin } from 'rxjs';
import { FolderDto, FolderService } from '../../../../core/services/folder.service';
import { KanjiDetailDto, KanjiUserService } from '../../../../core/services/kanji-user.service';
import { PagedResult, VocabularyDto, VocabularyService } from '../../../../core/services/vocabulary.service';
import { KanjiStrokeWriterComponent } from '../../../kanji/components/kanji-stroke-writer/kanji-stroke-writer.component';

interface FolderKanjiItem {
  kanjiId: number;
  character: string;
  amHanViet: string;
  usageCount: number;
  examples: string[];
  strokeCount: number | null;
}

type PreviewPosition = { x: number; y: number };
type HoverPreviewState =
  | {
    kind: 'vocab';
    vocab: VocabularyDto;
    position: PreviewPosition;
  }
  | {
    kind: 'kanji';
    kanji: FolderKanjiItem;
    position: PreviewPosition;
  };

@Component({
  selector: 'app-folder-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, KanjiStrokeWriterComponent],
  templateUrl: './folder-detail.component.html',
  styleUrl: './folder-detail.component.css',
})
export class FolderDetailComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly folderService = inject(FolderService);
  private readonly vocabularyService = inject(VocabularyService);
  private readonly kanjiService = inject(KanjiUserService);
  private readonly destroyRef = inject(DestroyRef);

  readonly folder = signal<FolderDto | null>(null);
  readonly vocabularies = signal<VocabularyDto[]>([]);
  readonly kanjiItems = signal<FolderKanjiItem[]>([]);
  readonly selectedVocab = signal<VocabularyDto | null>(null);
  readonly selectedKanji = signal<FolderKanjiItem | null>(null);
  readonly selectedKanjiDetail = signal<KanjiDetailDto | null>(null);
  readonly selectedKanjiLoading = signal(false);
  readonly searchQuery = signal('');
  readonly isLoading = signal(true);
  readonly toast = signal<{ type: 'success' | 'error'; text: string } | null>(null);
  readonly hoverPreview = signal<HoverPreviewState | null>(null);
  readonly hoverPreviewVisible = signal(false);
  readonly hoverKanjiDetail = signal<KanjiDetailDto | null>(null);
  readonly hoverKanjiLoading = signal(false);

  readonly filteredVocabs = computed(() => this.filterVocabs());
  readonly filteredKanji = computed(() => this.filterKanji());
  readonly hoverPreviewVocab = computed(() => {
    const preview = this.hoverPreview();
    return preview?.kind === 'vocab' ? preview.vocab : null;
  });
  readonly hoverPreviewKanji = computed(() => {
    const preview = this.hoverPreview();
    return preview?.kind === 'kanji' ? preview.kanji : null;
  });

  private previewTimer: ReturnType<typeof setTimeout> | null = null;
  private hoverRequestToken = 0;
  private selectedRequestToken = 0;
  private readonly kanjiDetailCache = new Map<number, KanjiDetailDto>();

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const folderId = Number(params.get('id'));
      if (!Number.isFinite(folderId) || folderId <= 0) {
        this.showToast('error', 'Folder không hợp lệ.');
        this.isLoading.set(false);
        return;
      }
      this.loadFolder(folderId);
    });
  }

  ngOnDestroy(): void {
    this.clearPreviewTimer();
  }

  loadFolder(folderId: number): void {
    this.isLoading.set(true);
    this.folder.set(null);
    this.vocabularies.set([]);
    this.kanjiItems.set([]);
    this.selectedVocab.set(null);
    this.selectedKanji.set(null);
    this.selectedKanjiDetail.set(null);
    this.clearPreview();

    forkJoin({
      folder: this.folderService.getById(folderId),
      vocabResult: this.vocabularyService.getVocabularies({ folderId, pageSize: 1000 }),
    }).subscribe({
      next: ({ folder, vocabResult }) => {
        this.folder.set(folder);
        this.vocabularies.set(vocabResult.items);
        this.kanjiItems.set(this.buildKanjiItems(vocabResult));
        this.isLoading.set(false);
        this.selectInitialItem(vocabResult.items);
      },
      error: (err) => {
        this.isLoading.set(false);
        const message = (err as { message?: string })?.message ?? 'Không thể tải folder.';
        this.showToast('error', message);
      },
    });
  }

  onSearchInput(value: string): void {
    this.searchQuery.set(value);
  }

  selectVocab(vocab: VocabularyDto): void {
    this.selectedVocab.set(vocab);
    this.selectedKanji.set(null);
    this.selectedKanjiDetail.set(null);
    this.selectedKanjiLoading.set(false);
  }

  selectKanji(item: FolderKanjiItem): void {
    this.selectedKanji.set(item);
    this.selectedVocab.set(null);
    this.selectedKanjiDetail.set(null);
    this.selectedKanjiLoading.set(true);

    const token = ++this.selectedRequestToken;
    const cached = this.kanjiDetailCache.get(item.kanjiId);
    if (cached) {
      this.selectedKanjiDetail.set(cached);
      this.selectedKanjiLoading.set(false);
      return;
    }

    this.kanjiService.getById(item.kanjiId).subscribe({
      next: (detail) => {
        this.kanjiDetailCache.set(item.kanjiId, detail);
        if (this.selectedRequestToken === token && this.selectedKanji()?.kanjiId === item.kanjiId) {
          this.selectedKanjiDetail.set(detail);
          this.selectedKanjiLoading.set(false);
        }
      },
      error: () => {
        if (this.selectedRequestToken === token && this.selectedKanji()?.kanjiId === item.kanjiId) {
          this.selectedKanjiLoading.set(false);
          this.showToast('error', 'Không thể tải chi tiết kanji.');
        }
      },
    });
  }

  openVocabDetail(vocab: VocabularyDto): void {
    const isKanji = vocab.kanjiComponents.length === 1 && vocab.kanjiComponents[0].character === vocab.word;
    if (isKanji) {
      this.router.navigate(['/kanji'], { queryParams: { character: vocab.word } });
    } else {
      this.router.navigate(['/vocabulary'], { queryParams: { word: vocab.word } });
    }
  }

  openKanjiDetail(item: FolderKanjiItem): void {
    this.router.navigate(['/kanji'], {
      queryParams: { id: item.kanjiId, character: item.character },
    });
  }

  handleVocabHover(vocab: VocabularyDto, event: MouseEvent): void {
    this.schedulePreview({
      kind: 'vocab',
      vocab,
      position: this.resolvePreviewPosition(event),
    });
  }

  handleKanjiHover(item: FolderKanjiItem, event: MouseEvent): void {
    this.schedulePreview({
      kind: 'kanji',
      kanji: item,
      position: this.resolvePreviewPosition(event),
    });

    this.hoverKanjiLoading.set(true);
    this.hoverKanjiDetail.set(null);
    const token = ++this.hoverRequestToken;
    const cached = this.kanjiDetailCache.get(item.kanjiId);
    if (cached) {
      this.hoverKanjiDetail.set(cached);
      this.hoverKanjiLoading.set(false);
      return;
    }

    this.kanjiService.getById(item.kanjiId).subscribe({
      next: (detail) => {
        this.kanjiDetailCache.set(item.kanjiId, detail);
        const preview = this.hoverPreview();
        if (this.hoverRequestToken === token && preview?.kind === 'kanji' && preview.kanji.kanjiId === item.kanjiId) {
          this.hoverKanjiDetail.set(detail);
          this.hoverKanjiLoading.set(false);
        }
      },
      error: () => {
        if (this.hoverRequestToken === token) {
          this.hoverKanjiLoading.set(false);
        }
      },
    });
  }

  updatePreviewPosition(event: MouseEvent): void {
    const preview = this.hoverPreview();
    if (!preview) return;
    this.hoverPreview.set({
      ...preview,
      position: this.resolvePreviewPosition(event),
    });
  }

  clearPreview(): void {
    this.hoverKanjiDetail.set(null);
    this.hoverKanjiLoading.set(false);
    this.hoverPreviewVisible.set(false);
    this.hoverPreview.set(null);
    this.clearPreviewTimer();
  }

  leavePreview(): void {
    this.clearPreview();
  }

  keepPreviewOpen(): void {
    this.clearPreviewTimer();
  }

  isSelectedVocab(vocabId: number): boolean {
    return this.selectedVocab()?.id === vocabId;
  }

  isSelectedKanji(kanjiId: number): boolean {
    return this.selectedKanji()?.kanjiId === kanjiId;
  }

  get selectedCount(): number {
    return this.vocabularies().length + this.kanjiItems().length;
  }

  get vocabCount(): number {
    return this.vocabularies().length;
  }

  get kanjiCount(): number {
    return this.kanjiItems().length;
  }

  get totalKanjiMentions(): number {
    return this.kanjiItems().reduce((sum, item) => sum + item.usageCount, 0);
  }

  get activePanelTitle(): string {
    if (this.selectedKanji()) return 'Hồ sơ kanji';
    if (this.selectedVocab()) return 'Hồ sơ từ vựng';
    return 'Hồ sơ học tập';
  }

  get activePanelSubtitle(): string {
    const kanji = this.selectedKanji();
    if (kanji) {
      return `${kanji.usageCount} lần xuất hiện trong folder này`;
    }

    const vocab = this.selectedVocab();
    if (vocab) {
      return 'Double click để mở trang tra cứu đầy đủ';
    }

    return 'Chọn một mục ở bên trái để xem chi tiết';
  }

  trackByVocab(_: number, vocab: VocabularyDto): number {
    return vocab.id;
  }

  trackByKanji(_: number, item: FolderKanjiItem): number {
    return item.kanjiId;
  }

  getJlptColor(level: number | null): string {
    const colors: Record<number, string> = {
      1: '#b42318',
      2: '#c47f00',
      3: '#0f766e',
      4: '#2563eb',
      5: '#6d28d9',
    };
    return level ? colors[level] ?? '#64748b' : '#64748b';
  }

  private buildKanjiItems(result: PagedResult<VocabularyDto>): FolderKanjiItem[] {
    const map = new Map<number, FolderKanjiItem>();
    for (const vocab of result.items) {
      for (const component of vocab.kanjiComponents) {
        const existing = map.get(component.kanjiId);
        if (existing) {
          existing.usageCount += 1;
          if (existing.examples.length < 3 && !existing.examples.includes(vocab.word)) {
            existing.examples.push(vocab.word);
          }
          continue;
        }

        map.set(component.kanjiId, {
          kanjiId: component.kanjiId,
          character: component.character,
          amHanViet: component.amHanViet,
          usageCount: 1,
          examples: [vocab.word],
          strokeCount: null,
        });
      }
    }

    return [...map.values()].sort((a, b) => a.character.localeCompare(b.character, 'ja'));
  }

  private selectInitialItem(vocabs: VocabularyDto[]): void {
    if (vocabs.length > 0) {
      this.selectVocab(vocabs[0]);
      return;
    }

    const kanji = this.kanjiItems()[0];
    if (kanji) {
      this.selectKanji(kanji);
      return;
    }

    this.selectedVocab.set(null);
    this.selectedKanji.set(null);
  }

  private filterVocabs(): VocabularyDto[] {
    const query = this.normalizeQuery(this.searchQuery());
    const vocabs = this.vocabularies();
    if (!query) return vocabs;

    return vocabs.filter((vocab) => {
      const haystack = [
        vocab.word,
        vocab.pronunciation ?? '',
        vocab.meaning,
        vocab.folderName,
        ...vocab.kanjiComponents.map((item) => `${item.character} ${item.amHanViet}`),
      ].join(' ');
      return this.matchesQuery(haystack, query);
    });
  }

  private filterKanji(): FolderKanjiItem[] {
    const query = this.normalizeQuery(this.searchQuery());
    const items = this.kanjiItems();
    if (!query) return items;

    return items.filter((item) => {
      const haystack = [
        item.character,
        item.amHanViet,
        ...item.examples,
        String(item.usageCount),
      ].join(' ');
      return this.matchesQuery(haystack, query);
    });
  }

  private normalizeQuery(value: string): string {
    return value
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  private matchesQuery(value: string, query: string): boolean {
    const normalized = this.normalizeQuery(value);
    return normalized.includes(query);
  }

  private resolvePreviewPosition(event: MouseEvent): PreviewPosition {
    const fallback = { x: 24, y: 24 };
    if (typeof window === 'undefined') return fallback;

    const width = 380;
    const height = 420;
    const x = Math.min(event.clientX + 18, window.innerWidth - width - 18);
    const y = Math.min(event.clientY + 18, window.innerHeight - height - 18);

    return {
      x: Math.max(16, x),
      y: Math.max(16, y),
    };
  }

  private schedulePreview(preview: HoverPreviewState): void {
    this.clearPreviewTimer();
    this.hoverPreviewVisible.set(false);
    this.hoverPreview.set(preview);
    this.previewTimer = setTimeout(() => {
      this.hoverPreviewVisible.set(true);
    }, 1000);
  }

  private clearPreviewTimer(): void {
    if (this.previewTimer) {
      clearTimeout(this.previewTimer);
      this.previewTimer = null;
    }
  }

  private showToast(type: 'success' | 'error', text: string): void {
    this.toast.set({ type, text });
    setTimeout(() => {
      if (this.toast()?.text === text) {
        this.toast.set(null);
      }
    }, 3200);
  }
}
