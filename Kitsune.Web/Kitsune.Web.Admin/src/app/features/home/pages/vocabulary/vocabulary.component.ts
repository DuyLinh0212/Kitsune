import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnDestroy, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { AuthService } from '../../../../core/services/auth.service';
import {
  CreateFolderDto,
  CreateVocabularyDto,
  LanguageDto,
  PagedResult,
  UpdateVocabularyDto,
  VocabularyAdminService,
  VocabularyDto,
  VocabularyFolderDto
} from '../../../../core/services/vocabulary-admin.service';
import {
  VocabularyImportAdminService,
  VocabularyImportLogEntry,
  VocabularyImportProgressDto,
  VocabularyImportSummaryDto
} from '../../../../core/services/vocabulary-import-admin.service';

type ActiveTab = 'import' | 'folders' | 'vocabulary';
type ModalMode = 'create' | 'edit';

interface VocabularySpecificData {
  kanji?: string | null;
  amHanViet?: string | null;
  exampleSentence?: string | null;
  exampleMeaning?: string | null;
}

@Component({
  selector: 'app-vocabulary',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './vocabulary.component.html',
  styleUrl: './vocabulary.component.css'
})
export class VocabularyComponent implements OnDestroy {
  private readonly authService = inject(AuthService);
  private readonly vocabService = inject(VocabularyAdminService);
  private readonly importService = inject(VocabularyImportAdminService);
  private readonly fb = inject(FormBuilder);

  // ── Auth ──────────────────────────────────────────────────────────────
  protected readonly user = signal(this.authService.getStoredUser());
  protected readonly displayName = computed(() => this.user()?.fullName || this.user()?.username || 'Admin');
  protected readonly roleLabel = computed(() =>
    this.user()?.roles.includes('ADMIN') ? 'Quản trị viên' : 'Điều phối viên'
  );

  // ── Tabs ──────────────────────────────────────────────────────────────
  protected readonly activeTab = signal<ActiveTab>('import');

  // ── Languages & folders for dropdowns ────────────────────────────────
  protected readonly languages = signal<LanguageDto[]>([]);
  protected readonly folders = signal<VocabularyFolderDto[]>([]);

  // ── Tab: Folders ─────────────────────────────────────────────────────
  protected readonly foldersLoading = signal(false);
  protected readonly foldersError = signal('');
  protected readonly showCreateFolderForm = signal(false);

  protected readonly folderForm = this.fb.group({
    folderName: ['', [Validators.required, Validators.maxLength(100)]],
    description: ['', Validators.maxLength(255)],
    isPublic: [false]
  });
  protected readonly folderSaving = signal(false);

  // ── Tab: Vocabulary ───────────────────────────────────────────────────
  protected readonly vocabResult = signal<PagedResult<VocabularyDto> | null>(null);
  protected readonly vocabLoading = signal(false);
  protected readonly vocabError = signal('');
  protected readonly vocabPage = signal(1);
  protected readonly vocabSearch = signal('');
  protected readonly vocabFolderFilter = signal<number | null>(null);
  protected readonly vocabLangFilter = signal<number | null>(null);

  protected readonly totalPages = computed(() => this.vocabResult()?.totalPages ?? 0);

  // ── Vocabulary Modal ──────────────────────────────────────────────────
  protected readonly modalVisible = signal(false);
  protected readonly modalMode = signal<ModalMode>('create');
  protected readonly editingId = signal<number | null>(null);
  protected readonly modalSaving = signal(false);
  protected readonly modalError = signal('');
  protected readonly deleteConfirmId = signal<number | null>(null);

  protected readonly vocabForm = this.fb.group({
    folderId: [null as number | null, Validators.required],
    languageId: [null as number | null, Validators.required],
    word: ['', [Validators.required, Validators.maxLength(100)]],
    pronunciation: ['', Validators.maxLength(100)],
    meaning: ['', [Validators.required, Validators.maxLength(500)]]
  });

  // ── Detail drawer ─────────────────────────────────────────────────────
  protected readonly detailVisible = signal(false);
  protected readonly detailVocab = signal<VocabularyDto | null>(null);

  /** Parsed `specificData` JSON of the vocabulary being viewed (null if absent/invalid). */
  protected readonly detailSpecific = computed<VocabularySpecificData | null>(() => {
    const raw = this.detailVocab()?.specificData;
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as VocabularySpecificData;
      return parsed && typeof parsed === 'object' ? parsed : null;
    } catch {
      return null;
    }
  });

  /** True when there is at least one example field to show. */
  protected readonly detailHasExample = computed(() => {
    const s = this.detailSpecific();
    return !!(s?.exampleSentence || s?.exampleMeaning);
  });

  // ── Tab: Import ───────────────────────────────────────────────────────
  protected readonly importing = signal(false);
  protected readonly importProgress = signal<VocabularyImportProgressDto | null>(null);
  protected readonly importLogs = signal<VocabularyImportLogEntry[]>([]);
  protected readonly importSummary = signal<VocabularyImportSummaryDto | null>(null);
  protected readonly importError = signal('');

  protected readonly importForm = this.fb.group({
    sourceDir: ['', Validators.required],
    folderName: ['', Validators.required]
  });

  private abortController: AbortController | null = null;

  // ── Tab switching ─────────────────────────────────────────────────────
  protected switchTab(tab: ActiveTab): void {
    this.activeTab.set(tab);
    if (tab === 'folders' && this.folders().length === 0) {
      this.loadFolders();
    }
    if (tab === 'vocabulary') {
      this.loadLanguagesAndFolders();
      this.loadVocabularies();
    }
  }

  private loadLanguagesAndFolders(): void {
    if (this.languages().length === 0) {
      this.vocabService.getLanguages().subscribe({
        next: (langs) => this.languages.set(langs)
      });
    }
    if (this.folders().length === 0) {
      this.vocabService.getFolders().subscribe({
        next: (folders) => this.folders.set(folders)
      });
    }
  }

  // ── Folders tab ───────────────────────────────────────────────────────
  private loadFolders(): void {
    this.foldersLoading.set(true);
    this.foldersError.set('');
    this.vocabService.getFolders().subscribe({
      next: (folders) => {
        this.folders.set(folders);
        this.foldersLoading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.foldersError.set(err.error?.message ?? 'Không thể tải danh sách thư mục.');
        this.foldersLoading.set(false);
      }
    });
  }

  protected toggleCreateFolderForm(): void {
    this.showCreateFolderForm.update((v) => !v);
    if (!this.showCreateFolderForm()) {
      this.folderForm.reset({ isPublic: false });
    }
  }

  protected submitCreateFolder(): void {
    if (this.folderForm.invalid || this.folderSaving()) return;

    const dto: CreateFolderDto = {
      folderName: this.folderForm.value.folderName!,
      description: this.folderForm.value.description || null,
      isPublic: this.folderForm.value.isPublic ?? false
    };

    this.folderSaving.set(true);
    this.vocabService.createFolder(dto).subscribe({
      next: () => {
        this.folderSaving.set(false);
        this.showCreateFolderForm.set(false);
        this.folderForm.reset({ isPublic: false });
        this.loadFolders();
      },
      error: (err: HttpErrorResponse) => {
        this.foldersError.set(err.error?.message ?? 'Không thể tạo thư mục.');
        this.folderSaving.set(false);
      }
    });
  }

  protected deleteFolder(id: number): void {
    this.vocabService.deleteFolder(id).subscribe({
      next: () => this.loadFolders(),
      error: (err: HttpErrorResponse) => {
        this.foldersError.set(err.error?.message ?? 'Không thể xóa thư mục.');
      }
    });
  }

  // ── Vocabulary tab ────────────────────────────────────────────────────
  protected loadVocabularies(): void {
    this.vocabLoading.set(true);
    this.vocabError.set('');

    this.vocabService
      .getVocabularies({
        search: this.vocabSearch() || undefined,
        folderId: this.vocabFolderFilter() ?? undefined,
        languageId: this.vocabLangFilter() ?? undefined,
        page: this.vocabPage(),
        pageSize: 20
      })
      .subscribe({
        next: (result) => {
          this.vocabResult.set(result);
          this.vocabLoading.set(false);
        },
        error: (err: HttpErrorResponse) => {
          this.vocabError.set(err.error?.message ?? 'Không thể tải danh sách từ vựng.');
          this.vocabLoading.set(false);
        }
      });
  }

  protected onSearchChange(value: string): void {
    this.vocabSearch.set(value);
    this.vocabPage.set(1);
    this.loadVocabularies();
  }

  protected onFolderFilterChange(value: string): void {
    this.vocabFolderFilter.set(value ? Number(value) : null);
    this.vocabPage.set(1);
    this.loadVocabularies();
  }

  protected onLangFilterChange(value: string): void {
    this.vocabLangFilter.set(value ? Number(value) : null);
    this.vocabPage.set(1);
    this.loadVocabularies();
  }

  protected goToPage(page: number): void {
    const total = this.totalPages();
    if (page < 1 || page > total) return;
    this.vocabPage.set(page);
    this.loadVocabularies();
  }

  protected get pageNumbers(): number[] {
    const total = this.totalPages();
    const current = this.vocabPage();
    const range: number[] = [];
    const delta = 2;
    for (let i = Math.max(1, current - delta); i <= Math.min(total, current + delta); i++) {
      range.push(i);
    }
    return range;
  }

  // ── Detail drawer ─────────────────────────────────────────────────────
  protected openDetail(vocab: VocabularyDto): void {
    this.detailVocab.set(vocab);
    this.detailVisible.set(true);
  }

  protected closeDetail(): void {
    this.detailVisible.set(false);
    this.detailVocab.set(null);
  }

  /** Switch from the detail drawer straight into the edit modal. */
  protected editFromDetail(): void {
    const vocab = this.detailVocab();
    if (!vocab) return;
    this.closeDetail();
    this.openEditModal(vocab);
  }

  // ── Vocabulary CRUD ───────────────────────────────────────────────────
  protected openCreateModal(): void {
    this.modalMode.set('create');
    this.editingId.set(null);
    this.modalError.set('');
    this.vocabForm.reset();
    this.modalVisible.set(true);
  }

  protected openEditModal(vocab: VocabularyDto): void {
    this.modalMode.set('edit');
    this.editingId.set(vocab.id);
    this.modalError.set('');
    this.vocabForm.setValue({
      folderId: vocab.folderId,
      languageId: vocab.languageId,
      word: vocab.word,
      pronunciation: vocab.pronunciation ?? '',
      meaning: vocab.meaning
    });
    this.modalVisible.set(true);
  }

  protected closeModal(): void {
    this.modalVisible.set(false);
    this.vocabForm.reset();
    this.editingId.set(null);
    this.modalError.set('');
  }

  protected submitVocabForm(): void {
    if (this.vocabForm.invalid || this.modalSaving()) return;

    const v = this.vocabForm.value;
    this.modalSaving.set(true);
    this.modalError.set('');

    if (this.modalMode() === 'create') {
      const dto: CreateVocabularyDto = {
        folderId: v.folderId!,
        languageId: v.languageId!,
        word: v.word!,
        pronunciation: v.pronunciation || null,
        meaning: v.meaning!
      };
      this.vocabService.create(dto).subscribe({
        next: () => {
          this.modalSaving.set(false);
          this.closeModal();
          this.loadVocabularies();
        },
        error: (err: HttpErrorResponse) => {
          this.modalError.set(err.error?.message ?? 'Không thể tạo từ vựng.');
          this.modalSaving.set(false);
        }
      });
    } else {
      const dto: UpdateVocabularyDto = {
        word: v.word ?? undefined,
        pronunciation: v.pronunciation || null,
        meaning: v.meaning ?? undefined
      };
      this.vocabService.update(this.editingId()!, dto).subscribe({
        next: () => {
          this.modalSaving.set(false);
          this.closeModal();
          this.loadVocabularies();
        },
        error: (err: HttpErrorResponse) => {
          this.modalError.set(err.error?.message ?? 'Không thể cập nhật từ vựng.');
          this.modalSaving.set(false);
        }
      });
    }
  }

  protected confirmDelete(id: number): void {
    this.deleteConfirmId.set(id);
  }

  protected cancelDelete(): void {
    this.deleteConfirmId.set(null);
  }

  protected executeDelete(id: number): void {
    this.vocabService.delete(id).subscribe({
      next: () => {
        this.deleteConfirmId.set(null);
        this.loadVocabularies();
      },
      error: (err: HttpErrorResponse) => {
        this.vocabError.set(err.error?.message ?? 'Không thể xóa từ vựng.');
        this.deleteConfirmId.set(null);
      }
    });
  }

  // ── Import tab ────────────────────────────────────────────────────────
  protected async startImport(): Promise<void> {
    if (this.importForm.invalid || this.importing()) return;

    this.importing.set(true);
    this.importError.set('');
    this.importProgress.set(null);
    this.importSummary.set(null);
    this.importLogs.set([]);

    this.abortController = new AbortController();

    try {
      await this.importService.importFromDirectoryStreamJson(
        this.importForm.value.sourceDir ?? undefined,
        this.importForm.value.folderName ?? undefined,
        (message) => {
          if (message.type === 'progress') {
            const p = message.payload;
            this.importProgress.set(p);
            const tone = p.isError ? 'error' : p.isWarning ? 'warning' : p.isCompleted ? 'success' : 'info';
            this.addLog({
              id: crypto.randomUUID(),
              timestamp: new Date().toLocaleTimeString('vi-VN'),
              stage: p.stage,
              message: p.message,
              currentWord: p.currentWord,
              currentFileName: p.currentFileName,
              tone
            });
          } else if (message.type === 'complete') {
            this.importSummary.set(message.payload);
            this.importing.set(false);
          } else {
            this.importError.set(message.payload.message);
            this.importing.set(false);
          }
        },
        this.abortController.signal
      );
    } catch (err) {
      if (!(err instanceof DOMException && err.name === 'AbortError')) {
        this.importError.set(err instanceof Error ? err.message : 'Lỗi không xác định.');
      }
      this.importing.set(false);
    }
  }

  protected cancelImport(): void {
    this.abortController?.abort();
    this.abortController = null;
    this.importing.set(false);
  }

  private addLog(entry: VocabularyImportLogEntry): void {
    this.importLogs.update((logs) => [entry, ...logs].slice(0, 150));
  }

  protected get importProgressPercent(): number {
    const p = this.importProgress();
    if (!p || p.totalRecords === 0) return 0;
    return Math.round((p.processedRecords / p.totalRecords) * 100);
  }

  protected get importFilePercent(): number {
    const p = this.importProgress();
    if (!p || p.totalFiles === 0) return 0;
    return Math.round((p.currentFileIndex / p.totalFiles) * 100);
  }

  ngOnDestroy(): void {
    this.abortController?.abort();
  }
}
