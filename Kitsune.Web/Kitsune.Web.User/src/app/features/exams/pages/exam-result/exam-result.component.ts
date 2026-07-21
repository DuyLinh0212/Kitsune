import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin } from 'rxjs';

import { LoadingFoxComponent } from '../../../../shared/components/loading-fox/loading-fox.component';
import {
  AttemptAnswerDetailDto,
  AttemptResultDto,
  EXAM_QUESTION_TYPE_LABELS,
  ExamDetailDto,
  ExamQuestionDto,
  ExamService
} from '../../../../core/services/exam.service';

interface ReviewItem {
  question: ExamQuestionDto;
  selectedAnswer: string | null;
  isCorrect: boolean;
}

@Component({
  selector: 'app-exam-result',
  standalone: true,
  imports: [CommonModule, RouterLink, LoadingFoxComponent],
  templateUrl: './exam-result.component.html',
  styleUrl: './exam-result.component.css'
})
export class ExamResultComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly examService = inject(ExamService);
  private readonly destroyRef = inject(DestroyRef);

  readonly typeLabels = EXAM_QUESTION_TYPE_LABELS;

  readonly attempt = signal<AttemptResultDto | null>(null);
  readonly exam = signal<ExamDetailDto | null>(null);
  readonly reviewItems = signal<ReviewItem[]>([]);
  readonly isLoading = signal<boolean>(true);
  readonly errorMsg = signal<string | null>(null);
  readonly showOnlyWrong = signal<boolean>(false);

  readonly examId = signal<number>(0);

  readonly visibleItems = computed<ReviewItem[]>(() => {
    const items = this.reviewItems();
    return this.showOnlyWrong() ? items.filter((i) => !i.isCorrect) : items;
  });

  readonly wrongCount = computed<number>(() => this.reviewItems().filter((i) => !i.isCorrect).length);

  ngOnInit(): void {
    const examId = Number(this.route.snapshot.paramMap.get('id'));
    const attemptId = Number(this.route.snapshot.paramMap.get('attemptId'));
    this.examId.set(examId);

    if (!Number.isFinite(examId) || !Number.isFinite(attemptId)) {
      this.errorMsg.set('Liên kết kết quả không hợp lệ.');
      this.isLoading.set(false);
      return;
    }

    forkJoin({
      attempt: this.examService.getAttempt(attemptId),
      exam: this.examService.getExamForPlay(examId),
      answers: this.examService.getAttemptAnswers(attemptId)
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ attempt, exam, answers }) => {
          this.attempt.set(attempt);
          this.exam.set(exam);
          this.reviewItems.set(this.buildReview(exam, answers));
          this.isLoading.set(false);
        },
        error: (err) => {
          this.errorMsg.set((err as { message?: string })?.message ?? 'Không thể tải kết quả.');
          this.isLoading.set(false);
        }
      });
  }

  private buildReview(exam: ExamDetailDto, answers: AttemptAnswerDetailDto[]): ReviewItem[] {
    const answerMap = new Map<number, AttemptAnswerDetailDto>();
    for (const a of answers) answerMap.set(a.questionId, a);
    return exam.questions.map((q) => {
      const a = answerMap.get(q.id);
      return {
        question: q,
        selectedAnswer: a?.selectedAnswer ?? null,
        isCorrect: a?.isCorrect ?? false
      };
    });
  }

  toggleOnlyWrong(): void {
    this.showOnlyWrong.update((v) => !v);
  }

  scoreClass(): string {
    const acc = this.attempt()?.accuracyPercentage ?? 0;
    if (acc >= 80) return 'score--high';
    if (acc >= 50) return 'score--mid';
    return 'score--low';
  }

  scoreMessage(): string {
    const acc = this.attempt()?.accuracyPercentage ?? 0;
    if (acc >= 80) return 'Xuất sắc! Bạn đã nắm rất chắc phần này.';
    if (acc >= 50) return 'Khá tốt! Hãy ôn lại các câu sai để tiến bộ hơn.';
    return 'Cần cố gắng thêm. Xem lại các câu sai bên dưới nhé.';
  }

  formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const r = seconds % 60;
    return `${m}:${r.toString().padStart(2, '0')}`;
  }

  displayAnswer(q: ExamQuestionDto, value: string | null): string {
    if (!value) return '(bỏ trống)';
    return value;
  }
}
