import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { AnswerInput, ExamDetailDto, ExamQuestionDto, ExamService } from '../../../../core/services/exam.service';
import { EXAM_QUESTION_TYPE_LABELS, ExamQuestionType } from '../../../../core/services/exam.service';
import { LoadingFoxComponent } from '../../../../shared/components/loading-fox/loading-fox.component';

@Component({
  selector: 'app-exam-play',
  standalone: true,
  imports: [CommonModule, RouterLink, LoadingFoxComponent],
  templateUrl: './exam-play.component.html',
  styleUrl: './exam-play.component.css'
})
export class ExamPlayComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly examService = inject(ExamService);
  private readonly destroyRef = inject(DestroyRef);

  readonly typeLabels = EXAM_QUESTION_TYPE_LABELS;

  readonly exam = signal<ExamDetailDto | null>(null);
  readonly isLoading = signal<boolean>(true);
  readonly errorMsg = signal<string | null>(null);
  readonly currentIndex = signal<number>(0);
  readonly submitting = signal<boolean>(false);

  // Map questionId -> selected answer text.
  readonly selections = signal<Record<number, string>>({});
  // Cho SENTENCE_ORDER: map questionId -> mảng thành phần đã chọn theo thứ tự.
  readonly orderSelections = signal<Record<number, string[]>>({});

  readonly remainingSeconds = signal<number | null>(null);
  private timerId: ReturnType<typeof setInterval> | null = null;
  private startedAt = 0;

  readonly currentQuestion = computed<ExamQuestionDto | null>(() => {
    const e = this.exam();
    if (!e) return null;
    return e.questions[this.currentIndex()] ?? null;
  });

  readonly answeredCount = computed<number>(() => {
    const e = this.exam();
    if (!e) return 0;
    const sel = this.selections();
    const ord = this.orderSelections();
    return e.questions.filter((q) => {
      if (q.questionType === 'SENTENCE_ORDER') return (ord[q.id]?.length ?? 0) === q.options.length && q.options.length > 0;
      return !!sel[q.id];
    }).length;
  });

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!Number.isFinite(id) || id <= 0) {
      this.errorMsg.set('Đề không hợp lệ.');
      this.isLoading.set(false);
      return;
    }
    this.examService
      .getExamForPlay(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (detail) => {
          this.exam.set(detail);
          this.isLoading.set(false);
          this.startedAt = this.nowSeconds();
          if (detail.timeLimitInSeconds && detail.timeLimitInSeconds > 0) {
            this.remainingSeconds.set(detail.timeLimitInSeconds);
            this.startTimer();
          }
        },
        error: (err) => {
          this.errorMsg.set((err as { message?: string })?.message ?? 'Không thể tải đề. Đề có thể đã bị ẩn hoặc xóa.');
          this.isLoading.set(false);
        }
      });
  }

  ngOnDestroy(): void {
    this.clearTimer();
  }

  private nowSeconds(): number {
    return Math.floor(performance.now() / 1000);
  }

  private startTimer(): void {
    this.timerId = setInterval(() => {
      const remaining = (this.remainingSeconds() ?? 0) - 1;
      this.remainingSeconds.set(remaining);
      if (remaining <= 0) {
        this.clearTimer();
        this.submit();
      }
    }, 1000);
  }

  private clearTimer(): void {
    if (this.timerId !== null) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }

  isReadingType(type: ExamQuestionType): boolean {
    return type.startsWith('READING_');
  }

  // ── Trắc nghiệm ───────────────────────────────────────────────────────
  selectOption(questionId: number, option: string): void {
    this.selections.update((s) => ({ ...s, [questionId]: option }));
  }

  isSelected(questionId: number, option: string): boolean {
    return this.selections()[questionId] === option;
  }

  // ── Sắp xếp câu ───────────────────────────────────────────────────────
  toggleOrderToken(questionId: number, token: string): void {
    this.orderSelections.update((s) => {
      const current = s[questionId] ? [...s[questionId]] : [];
      const idx = current.indexOf(token);
      if (idx >= 0) current.splice(idx, 1);
      else current.push(token);
      return { ...s, [questionId]: current };
    });
  }

  orderTokenPosition(questionId: number, token: string): number {
    const arr = this.orderSelections()[questionId] ?? [];
    return arr.indexOf(token) + 1;
  }

  clearOrder(questionId: number): void {
    this.orderSelections.update((s) => ({ ...s, [questionId]: [] }));
  }

  // ── Điều hướng câu hỏi ────────────────────────────────────────────────
  goTo(index: number): void {
    const e = this.exam();
    if (!e) return;
    if (index >= 0 && index < e.questions.length) this.currentIndex.set(index);
  }

  next(): void {
    this.goTo(this.currentIndex() + 1);
  }

  prev(): void {
    this.goTo(this.currentIndex() - 1);
  }

  isQuestionAnswered(q: ExamQuestionDto): boolean {
    if (q.questionType === 'SENTENCE_ORDER') {
      return (this.orderSelections()[q.id]?.length ?? 0) === q.options.length && q.options.length > 0;
    }
    return !!this.selections()[q.id];
  }

  // ── Nộp bài ───────────────────────────────────────────────────────────
  submit(): void {
    const e = this.exam();
    if (!e || this.submitting()) return;
    this.clearTimer();
    this.submitting.set(true);

    const answers: AnswerInput[] = e.questions.map((q) => {
      let selected: string;
      if (q.questionType === 'SENTENCE_ORDER') {
        selected = (this.orderSelections()[q.id] ?? []).join('');
      } else {
        selected = this.selections()[q.id] ?? '';
      }
      const normalizedCorrect = q.questionType === 'SENTENCE_ORDER' ? q.correctAnswer.replace(/\s+/g, '') : q.correctAnswer;
      const normalizedSelected = q.questionType === 'SENTENCE_ORDER' ? selected.replace(/\s+/g, '') : selected;
      return {
        questionId: q.id,
        selectedAnswer: selected,
        isCorrect: normalizedSelected.length > 0 && normalizedSelected === normalizedCorrect
      };
    });

    const timeSpent = Math.max(0, this.nowSeconds() - this.startedAt);

    this.examService
      .saveAttempt({
        examId: e.id,
        timeSpentInSeconds: timeSpent,
        answers,
        totalQuestionsCount: e.questions.length
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (attemptId) => {
          void this.router.navigate(['/exams', e.id, 'result', attemptId]);
        },
        error: (err) => {
          this.submitting.set(false);
          this.errorMsg.set((err as { message?: string })?.message ?? 'Không thể lưu kết quả.');
        }
      });
  }

  formatTime(seconds: number | null): string {
    if (seconds === null) return '';
    const s = Math.max(0, seconds);
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${m}:${r.toString().padStart(2, '0')}`;
  }
}
