import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnDestroy, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { AuthService } from '../../../../core/services/auth.service';
import {
  CreateKanjiDto,
  CreateRadicalDto,
  KanjiAdminService,
  KanjiDto,
  KanjiImportLogEntry,
  KanjiImportProgressDto,
  KanjiImportSummaryDto,
  PagedResult,
  RadicalDto,
  UpdateKanjiDto,
  UpdateRadicalDto
} from '../../../../core/services/kanji-admin.service';

type ActiveTab = 'kanji' | 'radicals' | 'import';
type ModalMode = 'create' | 'edit';

@Component({
  selector: 'app-kanji',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './kanji.component.html',
  styleUrl: './kanji.component.css'
})
export class KanjiManagementComponent implements OnDestroy {
  private readonly authService = inject(AuthService);
  private readonly kanjiService = inject(KanjiAdminService);
  private readonly fb = inject(FormBuilder);

  // ── Auth ──────────────────────────────────────────────────────────────
  protected readonly user = signal(this.authService.getStoredUser());
  protected readonly displayName = computed(() => this.user()?.fullName || this.user()?.username || 'Admin');
  protected readonly roleLabel = computed(() =>
    this.user()?.roles.includes('ADMIN') ? 'Quản trị viên' : 'Điều phối viên'
  );

  // ── Tabs ──────────────────────────────────────────────────────────────
  protected readonly activeTab = signal<ActiveTab>('kanji');

  // ── Shared: radicals (filter + dropdown + tab) ────────────────────────
  protected readonly radicals = signal<RadicalDto[]>([]);
  protected readonly jlptLevels = [5, 4, 3, 2, 1];

  // ── Tab: Kanji list ───────────────────────────────────────────────────
  protected readonly kanjiResult = signal<PagedResult<KanjiDto> | null>(null);
  protected readonly kanjiLoading = signal(false);
  protected readonly kanjiError = signal('');
  protected readonly kanjiPage = signal(1);
  protected readonly kanjiSearch = signal('');
  protected readonly kanjiRadicalFilter = signal<number | null>(null);
  protected readonly kanjiJlptFilter = signal<number | null>(null);
  protected readonly totalPages = computed(() => this.kanjiResult()?.totalPages ?? 0);

  // ── Kanji modal ───────────────────────────────────────────────────────
  protected readonly modalVisible = signal(false);
  protected readonly modalMode = signal<ModalMode>('create');
  protected readonly editingId = signal<number | null>(null);
  protected readonly modalSaving = signal(false);
  protected readonly modalError = signal('');
  protected readonly deleteConfirmId = signal<number | null>(null);

  protected readonly kanjiForm = this.fb.group({
    character: ['', [Validators.required, Validators.maxLength(10)]],
    amHanViet: ['', [Validators.required, Validators.maxLength(100)]],
    meaning: ['', [Validators.required, Validators.maxLength(500)]],
    onyomi: ['', Validators.maxLength(100)],
    kunyomi: ['', Validators.maxLength(100)],
    strokeCount: [0, [Validators.required, Validators.min(0)]],
    jlptLevel: [null as number | null],
    radicalId: [null as number | null],
    mnemonic: ['']
  });

  // ── Kanji detail drawer ───────────────────────────────────────────────
  protected readonly detailVisible = signal(false);
  protected readonly detailKanji = signal<KanjiDto | null>(null);

  // ── Tab: Radicals ─────────────────────────────────────────────────────
  protected readonly radicalsLoading = signal(false);
  protected readonly radicalsError = signal('');
  protected readonly showRadicalForm = signal(false);
  protected readonly radicalMode = signal<ModalMode>('create');
  protected readonly editingRadicalId = signal<number | null>(null);
  protected readonly radicalSaving = signal(false);
  protected readonly radicalDeleteConfirmId = signal<number | null>(null);

  protected readonly radicalForm = this.fb.group({
    radicalCharacter: ['', [Validators.required, Validators.maxLength(10)]],
    radicalName: ['', [Validators.required, Validators.maxLength(100)]],
    englishName: ['', Validators.maxLength(100)],
    description: ['', Validators.maxLength(255)]
  });

  // ── Tab: Import ───────────────────────────────────────────────────────
  protected readonly importing = signal(false);
  protected readonly importProgress = signal<KanjiImportProgressDto | null>(null);
  protected readonly importLogs = signal<KanjiImportLogEntry[]>([]);
  protected readonly importSummary = signal<KanjiImportSummaryDto | null>(null);
  protected readonly importError = signal('');

  protected readonly importForm = this.fb.group({
    sourceDir: ['']
  });

  private abortController: AbortController | null = null;

  constructor() {
    this.loadRadicals();
    this.loadKanjis();
  }

  ngOnDestroy(): void {
    this.abortController?.abort();
  }

  // ── Tabs ──────────────────────────────────────────────────────────────
  protected switchTab(tab: ActiveTab): void {
    this.activeTab.set(tab);
    if (tab === 'radicals' && this.radicals().length === 0) {
      this.loadRadicals();
    }
  }

  private loadRadicals(): void {
    this.radicalsLoading.set(true);
    this.kanjiService.radicals().subscribe({
      next: (items) => {
        this.radicals.set(items);
        this.radicalsLoading.set(false);
      },
      error: () => {
        this.radicals.set([]);
        this.radicalsLoading.set(false);
      }
    });
  }

  // ── Kanji tab ─────────────────────────────────────────────────────────
  protected loadKanjis(): void {
    this.kanjiLoading.set(true);
    this.kanjiError.set('');
    this.kanjiService
      .getKanjis({
        search: this.kanjiSearch() || undefined,
        radicalId: this.kanjiRadicalFilter() ?? undefined,
        jlptLevel: this.kanjiJlptFilter() ?? undefined,
        page: this.kanjiPage(),
        pageSize: 20
      })
      .subscribe({
        next: (result) => {
          this.kanjiResult.set(result);
          this.kanjiLoading.set(false);
        },
        error: (err: HttpErrorResponse) => {
          this.kanjiError.set(err.error?.message ?? 'Không thể tải danh sách kanji.');
          this.kanjiLoading.set(false);
        }
      });
  }

  protected onSearchChange(value: string): void {
    this.kanjiSearch.set(value);
    this.kanjiPage.set(1);
    this.loadKanjis();
  }

  protected onRadicalFilterChange(value: string): void {
    this.kanjiRadicalFilter.set(value ? Number(value) : null);
    this.kanjiPage.set(1);
    this.loadKanjis();
  }

  protected onJlptFilterChange(value: string): void {
    this.kanjiJlptFilter.set(value ? Number(value) : null);
    this.kanjiPage.set(1);
    this.loadKanjis();
  }

  protected goToPage(page: number): void {
    const total = this.totalPages();
    if (page < 1 || page > total) return;
    this.kanjiPage.set(page);
    this.loadKanjis();
  }

  protected get pageNumbers(): number[] {
    const total = this.totalPages();
    const current = this.kanjiPage();
    const range: number[] = [];
    const delta = 2;
    for (let i = Math.max(1, current - delta); i <= Math.min(total, current + delta); i++) {
      range.push(i);
    }
    return range;
  }

  // ── Kanji CRUD ────────────────────────────────────────────────────────
  protected openCreateModal(): void {
    this.modalMode.set('create');
    this.editingId.set(null);
    this.modalError.set('');
    this.kanjiForm.reset({ strokeCount: 0, jlptLevel: null, radicalId: null });
    this.kanjiForm.controls.character.enable();
    this.modalVisible.set(true);
  }

  protected openEditModal(kanji: KanjiDto): void {
    this.modalMode.set('edit');
    this.editingId.set(kanji.id);
    this.modalError.set('');
    this.kanjiForm.setValue({
      character: kanji.character,
      amHanViet: kanji.amHanViet,
      meaning: kanji.meaning,
      onyomi: kanji.onyomi ?? '',
      kunyomi: kanji.kunyomi ?? '',
      strokeCount: kanji.strokeCount,
      jlptLevel: kanji.jlptLevel,
      radicalId: kanji.radical?.id ?? null,
      mnemonic: kanji.mnemonic ?? ''
    });
    this.kanjiForm.controls.character.disable(); // character is immutable after creation
    this.modalVisible.set(true);
  }

  protected closeModal(): void {
    this.modalVisible.set(false);
    this.kanjiForm.controls.character.enable();
    this.kanjiForm.reset({ strokeCount: 0, jlptLevel: null, radicalId: null });
    this.editingId.set(null);
    this.modalError.set('');
  }

  protected submitKanjiForm(): void {
    if (this.kanjiForm.invalid || this.modalSaving()) return;

    const v = this.kanjiForm.getRawValue();
    this.modalSaving.set(true);
    this.modalError.set('');

    if (this.modalMode() === 'create') {
      const dto: CreateKanjiDto = {
        character: v.character!,
        amHanViet: v.amHanViet!,
        meaning: v.meaning!,
        onyomi: v.onyomi || null,
        kunyomi: v.kunyomi || null,
        strokeCount: v.strokeCount ?? 0,
        jlptLevel: v.jlptLevel ?? null,
        radicalId: v.radicalId ?? null,
        mnemonic: v.mnemonic || null
      };
      this.kanjiService.createKanji(dto).subscribe({
        next: () => this.afterSave(),
        error: (err: HttpErrorResponse) => this.onSaveError(err, 'Không thể tạo kanji.')
      });
    } else {
      const dto: UpdateKanjiDto = {
        amHanViet: v.amHanViet ?? undefined,
        meaning: v.meaning ?? undefined,
        onyomi: v.onyomi || null,
        kunyomi: v.kunyomi || null,
        strokeCount: v.strokeCount ?? undefined,
        jlptLevel: v.jlptLevel ?? null,
        mnemonic: v.mnemonic || null,
        radicalId: v.radicalId ?? null,
        clearRadical: v.radicalId == null
      };
      this.kanjiService.updateKanji(this.editingId()!, dto).subscribe({
        next: () => this.afterSave(),
        error: (err: HttpErrorResponse) => this.onSaveError(err, 'Không thể cập nhật kanji.')
      });
    }
  }

  private afterSave(): void {
    this.modalSaving.set(false);
    this.closeModal();
    this.loadKanjis();
    this.loadRadicals();
  }

  private onSaveError(err: HttpErrorResponse, fallback: string): void {
    this.modalError.set(err.error?.message ?? fallback);
    this.modalSaving.set(false);
  }

  protected confirmDelete(id: number): void {
    this.deleteConfirmId.set(id);
  }

  protected cancelDelete(): void {
    this.deleteConfirmId.set(null);
  }

  protected executeDelete(id: number): void {
    this.kanjiService.deleteKanji(id).subscribe({
      next: () => {
        this.deleteConfirmId.set(null);
        this.loadKanjis();
        this.loadRadicals();
      },
      error: (err: HttpErrorResponse) => {
        this.kanjiError.set(err.error?.message ?? 'Không thể xóa kanji.');
        this.deleteConfirmId.set(null);
      }
    });
  }

  // ── Kanji detail drawer ───────────────────────────────────────────────
  protected openDetail(kanji: KanjiDto): void {
    this.detailKanji.set(kanji);
    this.detailVisible.set(true);
  }

  protected closeDetail(): void {
    this.detailVisible.set(false);
    this.detailKanji.set(null);
  }

  protected editFromDetail(): void {
    const kanji = this.detailKanji();
    if (!kanji) return;
    this.closeDetail();
    this.openEditModal(kanji);
  }

  // ── Radicals tab ──────────────────────────────────────────────────────
  protected toggleRadicalForm(): void {
    this.showRadicalForm.update((v) => !v);
    if (!this.showRadicalForm()) {
      this.resetRadicalForm();
    } else {
      this.radicalMode.set('create');
      this.editingRadicalId.set(null);
    }
  }

  protected openEditRadical(radical: RadicalDto): void {
    this.radicalMode.set('edit');
    this.editingRadicalId.set(radical.id);
    this.radicalsError.set('');
    this.radicalForm.setValue({
      radicalCharacter: radical.radicalCharacter,
      radicalName: radical.radicalName,
      englishName: radical.englishName ?? '',
      description: radical.description ?? ''
    });
    this.showRadicalForm.set(true);
  }

  private resetRadicalForm(): void {
    this.radicalForm.reset();
    this.radicalMode.set('create');
    this.editingRadicalId.set(null);
  }

  protected submitRadicalForm(): void {
    if (this.radicalForm.invalid || this.radicalSaving()) return;

    const v = this.radicalForm.value;
    this.radicalSaving.set(true);
    this.radicalsError.set('');

    if (this.radicalMode() === 'create') {
      const dto: CreateRadicalDto = {
        radicalCharacter: v.radicalCharacter!,
        radicalName: v.radicalName!,
        englishName: v.englishName || null,
        description: v.description || null
      };
      this.kanjiService.createRadical(dto).subscribe({
        next: () => this.afterRadicalSave(),
        error: (err: HttpErrorResponse) => this.onRadicalError(err, 'Không thể tạo bộ thủ.')
      });
    } else {
      const dto: UpdateRadicalDto = {
        radicalCharacter: v.radicalCharacter ?? undefined,
        radicalName: v.radicalName ?? undefined,
        englishName: v.englishName || null,
        description: v.description || null
      };
      this.kanjiService.updateRadical(this.editingRadicalId()!, dto).subscribe({
        next: () => this.afterRadicalSave(),
        error: (err: HttpErrorResponse) => this.onRadicalError(err, 'Không thể cập nhật bộ thủ.')
      });
    }
  }

  private afterRadicalSave(): void {
    this.radicalSaving.set(false);
    this.showRadicalForm.set(false);
    this.resetRadicalForm();
    this.loadRadicals();
  }

  private onRadicalError(err: HttpErrorResponse, fallback: string): void {
    this.radicalsError.set(err.error?.message ?? fallback);
    this.radicalSaving.set(false);
  }

  protected confirmDeleteRadical(id: number): void {
    this.radicalDeleteConfirmId.set(id);
  }

  protected cancelDeleteRadical(): void {
    this.radicalDeleteConfirmId.set(null);
  }

  protected executeDeleteRadical(id: number): void {
    this.kanjiService.deleteRadical(id).subscribe({
      next: () => {
        this.radicalDeleteConfirmId.set(null);
        this.loadRadicals();
      },
      error: (err: HttpErrorResponse) => {
        this.radicalsError.set(err.error?.message ?? 'Không thể xóa bộ thủ.');
        this.radicalDeleteConfirmId.set(null);
      }
    });
  }

  // ── Import tab ────────────────────────────────────────────────────────
  protected async startImport(): Promise<void> {
    if (this.importing()) return;

    this.importing.set(true);
    this.importError.set('');
    this.importProgress.set(null);
    this.importSummary.set(null);
    this.importLogs.set([]);
    this.abortController = new AbortController();

    try {
      await this.kanjiService.importFromDirectoryStreamJson(
        this.importForm.value.sourceDir || undefined,
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
              currentCharacter: p.currentCharacter,
              currentFileName: p.currentFileName,
              tone
            });
          } else if (message.type === 'complete') {
            this.importSummary.set(message.payload);
            this.importing.set(false);
            this.loadRadicals();
            this.loadKanjis();
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

  private addLog(entry: KanjiImportLogEntry): void {
    this.importLogs.update((logs) => [entry, ...logs].slice(0, 150));
  }

  protected get importRecordPercent(): number {
    const p = this.importProgress();
    if (!p || p.totalRecords === 0) return 0;
    return Math.round((p.processedRecords / p.totalRecords) * 100);
  }

  protected get importFilePercent(): number {
    const p = this.importProgress();
    if (!p || p.totalFiles === 0) return 0;
    return Math.round((p.currentFileIndex / p.totalFiles) * 100);
  }
}
