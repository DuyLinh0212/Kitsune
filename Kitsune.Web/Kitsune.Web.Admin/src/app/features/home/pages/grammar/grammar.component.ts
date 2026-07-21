import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { AuthService } from '../../../../core/services/auth.service';
import {
  CreateGrammarDto,
  GrammarAdminService,
  GrammarPointDto,
  PagedResult,
  UpdateGrammarDto
} from '../../../../core/services/grammar-admin.service';
import {
  GrammarImportItem,
  GrammarImportResult,
  GrammarImportService
} from '../../../../core/services/grammar-import.service';

type ModalMode = 'create' | 'edit';

@Component({
  selector: 'app-grammar',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './grammar.component.html',
  styleUrl: './grammar.component.css'
})
export class GrammarManagementComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly grammarService = inject(GrammarAdminService);
  private readonly grammarImportService = inject(GrammarImportService);
  private readonly fb = inject(FormBuilder);

  // ── Auth ──────────────────────────────────────────────────────────────
  protected readonly user = signal(this.authService.getStoredUser());
  protected readonly displayName = computed(() => this.user()?.fullName || this.user()?.username || 'Admin');
  protected readonly roleLabel = computed(() =>
    this.user()?.roles.includes('ADMIN') ? 'Quản trị viên' : 'Điều phối viên'
  );

  protected readonly jlptLevels = [5, 4, 3, 2, 1];

  // ── List state ────────────────────────────────────────────────────────
  protected readonly result = signal<PagedResult<GrammarPointDto> | null>(null);
  protected readonly loading = signal(false);
  protected readonly listError = signal('');
  protected readonly page = signal(1);
  protected readonly search = signal('');
  protected readonly jlptFilter = signal<number | null>(null);
  protected readonly showDeleted = signal(false);

  protected readonly totalPages = computed(() => this.result()?.totalPages ?? 0);

  // ── Modal state ───────────────────────────────────────────────────────
  protected readonly modalVisible = signal(false);
  protected readonly modalMode = signal<ModalMode>('create');
  protected readonly editingId = signal<number | null>(null);
  protected readonly modalSaving = signal(false);
  protected readonly modalError = signal('');
  protected readonly deleteConfirmId = signal<number | null>(null);

  // ── Import ────────────────────────────────────────────────────────────
  protected readonly importModalVisible = signal(false);
  protected readonly importFile = signal<File | null>(null);
  protected readonly importResult = signal<GrammarImportResult | null>(null);
  protected readonly importParsing = signal(false);
  protected readonly importing = signal(false);
  protected readonly importError = signal('');
  protected readonly importSummary = signal('');

  protected readonly grammarForm: FormGroup = this.fb.group({
    title: ['', [Validators.required, Validators.maxLength(150)]],
    meaning: ['', [Validators.required, Validators.maxLength(500)]],
    structure: ['', Validators.maxLength(255)],
    jlptLevel: [null as number | null],
    explanation: ['', Validators.maxLength(2000)],
    examples: this.fb.array([])
  });

  protected get examples(): FormArray {
    return this.grammarForm.get('examples') as FormArray;
  }

  ngOnInit(): void {
    this.loadGrammar();
  }

  // ── List ──────────────────────────────────────────────────────────────
  protected loadGrammar(): void {
    this.loading.set(true);
    this.listError.set('');
    this.grammarService
      .getGrammarPoints({
        search: this.search() || undefined,
        jlptLevel: this.jlptFilter() ?? undefined,
        includeDeleted: this.showDeleted(),
        page: this.page(),
        pageSize: 20
      })
      .subscribe({
        next: (result) => {
          this.result.set(result);
          this.loading.set(false);
        },
        error: (err: HttpErrorResponse) => {
          this.listError.set(err.error?.message ?? 'Không thể tải danh sách ngữ pháp.');
          this.loading.set(false);
        }
      });
  }

  protected onSearchChange(value: string): void {
    this.search.set(value);
    this.page.set(1);
    this.loadGrammar();
  }

  protected onJlptFilterChange(value: string): void {
    this.jlptFilter.set(value ? Number(value) : null);
    this.page.set(1);
    this.loadGrammar();
  }

  protected toggleShowDeleted(): void {
    this.showDeleted.update((v) => !v);
    this.page.set(1);
    this.loadGrammar();
  }

  protected goToPage(page: number): void {
    const total = this.totalPages();
    if (page < 1 || page > total) return;
    this.page.set(page);
    this.loadGrammar();
  }

  protected get pageNumbers(): number[] {
    const total = this.totalPages();
    const current = this.page();
    const range: number[] = [];
    for (let i = Math.max(1, current - 2); i <= Math.min(total, current + 2); i++) range.push(i);
    return range;
  }

  // ── Examples FormArray ────────────────────────────────────────────────
  private makeExampleGroup(japaneseText = '', reading = '', meaningVi = ''): FormGroup {
    return this.fb.group({
      japaneseText: [japaneseText, [Validators.required, Validators.maxLength(255)]],
      reading: [reading, Validators.maxLength(255)],
      meaningVi: [meaningVi, Validators.maxLength(500)]
    });
  }

  protected addExample(): void {
    this.examples.push(this.makeExampleGroup());
  }

  protected removeExample(index: number): void {
    this.examples.removeAt(index);
  }

  // ── CRUD ──────────────────────────────────────────────────────────────
  protected openCreateModal(): void {
    this.modalMode.set('create');
    this.editingId.set(null);
    this.modalError.set('');
    this.grammarForm.reset({ jlptLevel: null });
    this.examples.clear();
    this.addExample();
    this.modalVisible.set(true);
  }

  protected openEditModal(grammar: GrammarPointDto): void {
    this.modalMode.set('edit');
    this.editingId.set(grammar.id);
    this.modalError.set('');
    this.grammarForm.reset({
      title: grammar.title,
      meaning: grammar.meaning,
      structure: grammar.structure ?? '',
      jlptLevel: grammar.jlptLevel,
      explanation: grammar.explanation ?? ''
    });
    this.examples.clear();
    if (grammar.examples.length === 0) {
      this.addExample();
    } else {
      for (const ex of grammar.examples) {
        this.examples.push(this.makeExampleGroup(ex.japaneseText, ex.reading ?? '', ex.meaningVi ?? ''));
      }
    }
    this.modalVisible.set(true);
  }

  protected closeModal(): void {
    this.modalVisible.set(false);
    this.grammarForm.reset({ jlptLevel: null });
    this.examples.clear();
    this.editingId.set(null);
    this.modalError.set('');
  }

  protected submitForm(): void {
    if (this.grammarForm.invalid || this.modalSaving()) {
      this.grammarForm.markAllAsTouched();
      return;
    }

    const v = this.grammarForm.value;
    const exampleInputs = (v.examples as Array<{ japaneseText: string; reading: string; meaningVi: string }>)
      .filter((e) => e.japaneseText.trim().length > 0)
      .map((e) => ({ japaneseText: e.japaneseText, reading: e.reading || null, meaningVi: e.meaningVi || null }));

    this.modalSaving.set(true);
    this.modalError.set('');

    if (this.modalMode() === 'create') {
      const dto: CreateGrammarDto = {
        title: v.title,
        meaning: v.meaning,
        structure: v.structure || null,
        jlptLevel: v.jlptLevel ?? null,
        explanation: v.explanation || null,
        examples: exampleInputs
      };
      this.grammarService.create(dto).subscribe({
        next: () => this.onSaveSuccess(),
        error: (err: HttpErrorResponse) => this.onSaveError(err, 'Không thể tạo ngữ pháp.')
      });
    } else {
      const dto: UpdateGrammarDto = {
        title: v.title,
        meaning: v.meaning,
        structure: v.structure || null,
        jlptLevel: v.jlptLevel ?? null,
        explanation: v.explanation || null,
        examples: exampleInputs
      };
      this.grammarService.update(this.editingId()!, dto).subscribe({
        next: () => this.onSaveSuccess(),
        error: (err: HttpErrorResponse) => this.onSaveError(err, 'Không thể cập nhật ngữ pháp.')
      });
    }
  }

  private onSaveSuccess(): void {
    this.modalSaving.set(false);
    this.closeModal();
    this.loadGrammar();
  }

  private onSaveError(err: HttpErrorResponse, fallback: string): void {
    this.modalError.set(err.error?.message ?? err.message ?? fallback);
    this.modalSaving.set(false);
  }

  protected confirmDelete(id: number): void {
    this.deleteConfirmId.set(id);
  }

  protected cancelDelete(): void {
    this.deleteConfirmId.set(null);
  }

  protected executeSoftDelete(id: number): void {
    this.grammarService.softDelete(id).subscribe({
      next: () => {
        this.deleteConfirmId.set(null);
        this.loadGrammar();
      },
      error: (err: HttpErrorResponse) => {
        this.listError.set(err.error?.message ?? 'Không thể xóa ngữ pháp.');
        this.deleteConfirmId.set(null);
      }
    });
  }

  protected restore(id: number): void {
    this.grammarService.restore(id).subscribe({
      next: () => this.loadGrammar(),
      error: (err: HttpErrorResponse) => this.listError.set(err.error?.message ?? 'Không thể khôi phục ngữ pháp.')
    });
  }

  // ── Import ────────────────────────────────────────────────────────────
  protected openImportModal(): void {
    this.importFile.set(null);
    this.importResult.set(null);
    this.importError.set('');
    this.importSummary.set('');
    this.importModalVisible.set(true);
  }

  protected closeImportModal(): void {
    if (this.importParsing() || this.importing()) return;
    this.importModalVisible.set(false);
  }

  protected onImportFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.importFile.set(file);
    this.importResult.set(null);
    this.importError.set('');
    this.importSummary.set('');
  }

  protected async parseImportFile(): Promise<void> {
    const file = this.importFile();
    if (!file || this.importParsing()) return;

    this.importParsing.set(true);
    this.importResult.set(null);
    this.importError.set('');
    this.importSummary.set('');
    try {
      this.importResult.set(await this.grammarImportService.parseWorkbook(file));
    } catch {
      this.importError.set('Không thể đọc tệp. Hãy chọn tệp Excel hoặc CSV hợp lệ.');
    } finally {
      this.importParsing.set(false);
    }
  }

  protected async importGrammar(): Promise<void> {
    const result = this.importResult();
    if (!result || result.errors.length > 0 || result.items.length === 0 || this.importing()) return;

    this.importing.set(true);
    this.importError.set('');
    let importedGrammar = 0;
    let importedExamples = 0;
    const failures: string[] = [];

    for (const item of result.items) {
      try {
        await firstValueFrom(this.grammarService.create(item.dto));
        importedGrammar++;
        importedExamples += item.dto.examples.length;
      } catch (error: unknown) {
        failures.push(this.importFailureMessage(item, error));
      }
    }

    this.importing.set(false);
    this.importSummary.set(
      `Đã nhập ${importedGrammar} ngữ pháp và ${importedExamples} ví dụ.${failures.length ? ` ${failures.length} mục không thể lưu.` : ''}`
    );
    if (failures.length) this.importError.set(failures.join(' '));
    this.loadGrammar();
  }

  private importFailureMessage(item: GrammarImportItem, error: unknown): string {
    const message = error instanceof Error ? error.message : 'Lỗi không xác định.';
    const rowLabel = item.startRow === item.endRow ? `Dòng ${item.startRow}` : `Dòng ${item.startRow}–${item.endRow}`;
    return `${rowLabel}: ${message}`;
  }

  protected jlptLabel(level: number | null): string {
    return level ? `N${level}` : '—';
  }
}
