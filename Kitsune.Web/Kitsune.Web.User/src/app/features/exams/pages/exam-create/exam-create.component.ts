import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import {
  CreateExamInput,
  EXAM_QUESTION_TYPES,
  EXAM_QUESTION_TYPE_LABELS,
  ExamQuestionInput,
  ExamQuestionType,
  ExamService
} from '../../../../core/services/exam.service';
import { ExamImportService, ImportRowError } from '../../../../core/services/exam-import.service';

type Tab = 'manual' | 'import';

@Component({
  selector: 'app-exam-create',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './exam-create.component.html',
  styleUrl: './exam-create.component.css'
})
export class ExamCreateComponent {
  private readonly fb = inject(FormBuilder);
  private readonly examService = inject(ExamService);
  private readonly importService = inject(ExamImportService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly tab = signal<Tab>('manual');
  readonly saving = signal<boolean>(false);
  readonly errorMsg = signal<string | null>(null);

  readonly jlptLevels: readonly number[] = [5, 4, 3, 2, 1];
  readonly questionTypes = EXAM_QUESTION_TYPES;
  readonly typeLabels = EXAM_QUESTION_TYPE_LABELS;

  // ── Import state ────────────────────────────────────────────────────────
  readonly importErrors = signal<ImportRowError[]>([]);
  readonly importPreview = signal<CreateExamInput | null>(null);
  readonly importFileName = signal<string>('');
  // Metadata cho import Excel/CSV (JSON tự chứa metadata)
  readonly importTitle = signal<string>('');
  readonly importJlpt = signal<number | null>(null);
  readonly importMinutes = signal<number | null>(null);

  readonly examForm: FormGroup = this.fb.group({
    title: ['', [Validators.required, Validators.maxLength(200)]],
    description: [''],
    jlptLevel: [null as number | null],
    timeLimitMinutes: [null as number | null],
    isPublic: [false],
    questions: this.fb.array([this.makeQuestionGroup()])
  });

  get questions(): FormArray {
    return this.examForm.get('questions') as FormArray;
  }

  private makeQuestionGroup(): FormGroup {
    return this.fb.group({
      questionType: ['VOCAB_MEANING' as ExamQuestionType, Validators.required],
      questionText: [''],
      passageText: [''],
      optionA: [''],
      optionB: [''],
      optionC: [''],
      optionD: [''],
      correctAnswer: ['', Validators.required],
      explanation: ['']
    });
  }

  addQuestion(): void {
    this.questions.push(this.makeQuestionGroup());
  }

  removeQuestion(index: number): void {
    if (this.questions.length > 1) this.questions.removeAt(index);
  }

  setTab(tab: Tab): void {
    this.tab.set(tab);
    this.errorMsg.set(null);
  }

  isReadingType(type: string): boolean {
    return type.startsWith('READING_');
  }

  isOrderType(type: string): boolean {
    return type === 'SENTENCE_ORDER';
  }

  // ── Submit manual ────────────────────────────────────────────────────────
  submitManual(): void {
    this.errorMsg.set(null);
    if (this.examForm.invalid) {
      this.examForm.markAllAsTouched();
      this.errorMsg.set('Vui lòng điền tên đề và đáp án đúng cho mỗi câu hỏi.');
      return;
    }

    const raw = this.examForm.getRawValue();
    const questions: ExamQuestionInput[] = [];
    for (let i = 0; i < raw.questions.length; i++) {
      const q = raw.questions[i];
      const options = [q.optionA, q.optionB, q.optionC, q.optionD].map((o: string) => (o ?? '').trim()).filter(Boolean);
      const correct = (q.correctAnswer ?? '').trim();
      const type = q.questionType as ExamQuestionType;

      if (type === 'SENTENCE_ORDER') {
        if (options.length < 2) {
          this.errorMsg.set(`Câu ${i + 1}: cần ít nhất 2 thành phần để sắp xếp.`);
          return;
        }
      } else {
        if (options.length < 2) {
          this.errorMsg.set(`Câu ${i + 1}: cần ít nhất 2 lựa chọn.`);
          return;
        }
        if (!options.includes(correct)) {
          this.errorMsg.set(`Câu ${i + 1}: đáp án đúng phải trùng với một trong các lựa chọn.`);
          return;
        }
      }

      questions.push({
        questionType: type,
        questionText: (q.questionText ?? '').trim() || null,
        passageText: (q.passageText ?? '').trim() || null,
        options,
        correctAnswer: correct,
        explanation: (q.explanation ?? '').trim() || null
      });
    }

    const input: CreateExamInput = {
      title: raw.title.trim(),
      description: (raw.description ?? '').trim() || null,
      jlptLevel: raw.jlptLevel !== null && raw.jlptLevel !== '' ? Number(raw.jlptLevel) : null,
      timeLimitInSeconds: raw.timeLimitMinutes ? Math.round(Number(raw.timeLimitMinutes) * 60) : null,
      isPublic: !!raw.isPublic,
      questions
    };

    this.persist(input);
  }

  // ── Import handlers ──────────────────────────────────────────────────────
  async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.importFileName.set(file.name);
    this.errorMsg.set(null);
    this.importPreview.set(null);
    this.importErrors.set([]);

    const lower = file.name.toLowerCase();
    try {
      if (lower.endsWith('.json')) {
        const text = await file.text();
        const result = this.importService.parseJson(text);
        this.importErrors.set(result.errors);
        this.importPreview.set(result.exam);
      } else if (lower.endsWith('.xlsx') || lower.endsWith('.xls') || lower.endsWith('.csv')) {
        const result = await this.importService.parseWorkbook(
          file,
          this.importTitle(),
          this.importJlpt(),
          this.importMinutes() ? Math.round((this.importMinutes() as number) * 60) : null
        );
        this.importErrors.set(result.errors);
        this.importPreview.set(result.exam);
      } else {
        this.errorMsg.set('Định dạng không hỗ trợ. Chỉ chấp nhận .json, .xlsx, .xls, .csv');
      }
    } catch (err) {
      this.errorMsg.set((err as { message?: string })?.message ?? 'Không thể đọc file.');
    } finally {
      input.value = '';
    }
  }

  saveImported(): void {
    const preview = this.importPreview();
    if (!preview) return;
    this.persist(preview);
  }

  onImportTitleChange(value: string): void {
    this.importTitle.set(value);
  }
  onImportJlptChange(value: string): void {
    this.importJlpt.set(value === '' ? null : Number(value));
  }
  onImportMinutesChange(value: string): void {
    this.importMinutes.set(value === '' ? null : Number(value));
  }

  private persist(input: CreateExamInput): void {
    this.saving.set(true);
    this.examService
      .create(input)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.saving.set(false);
          void this.router.navigate(['/exams/mine']);
        },
        error: (err) => {
          this.saving.set(false);
          this.errorMsg.set((err as { message?: string })?.message ?? 'Lưu đề thất bại.');
        }
      });
  }
}
