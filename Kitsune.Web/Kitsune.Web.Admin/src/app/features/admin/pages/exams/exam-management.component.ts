import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';

import { AdminExamDto, AdminExamQuestionDto, ExamAdminService } from '../../../../core/services/exam-admin.service';

type StatusFilter = 'all' | 'public' | 'hidden' | 'deleted';

@Component({
  selector: 'app-exam-management',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink],
  templateUrl: './exam-management.component.html',
  styleUrl: './exam-management.component.css'
})
export class ExamManagementComponent {
  private readonly examService = inject(ExamAdminService);
  private readonly destroyRef = inject(DestroyRef);

  readonly exams = signal<AdminExamDto[]>([]);
  readonly loading = signal<boolean>(true);
  readonly error = signal<string | null>(null);

  readonly search = signal<string>('');
  readonly jlptFilter = signal<number | null>(null);
  readonly statusFilter = signal<StatusFilter>('all');

  // Chi tiết câu hỏi trong modal xem trước.
  readonly detailExam = signal<AdminExamDto | null>(null);
  readonly detailQuestions = signal<AdminExamQuestionDto[]>([]);
  readonly detailLoading = signal<boolean>(false);

  readonly deleteConfirmId = signal<number | null>(null);
  readonly busyId = signal<number | null>(null);

  readonly jlptLevels: readonly number[] = [5, 4, 3, 2, 1];

  readonly filtered = computed<AdminExamDto[]>(() => {
    const term = this.search().trim().toLowerCase();
    const level = this.jlptFilter();
    const status = this.statusFilter();
    return this.exams().filter((e) => {
      if (term && !e.title.toLowerCase().includes(term) && !e.creatorName.toLowerCase().includes(term)) return false;
      if (level !== null && e.jlptLevel !== level) return false;
      if (status === 'public' && (!e.isPublic || e.isDeleted)) return false;
      if (status === 'hidden' && (e.isPublic || e.isDeleted)) return false;
      if (status === 'deleted' && !e.isDeleted) return false;
      if (status !== 'deleted' && e.isDeleted) return false;
      return true;
    });
  });

  readonly stats = computed(() => {
    const all = this.exams();
    return {
      total: all.length,
      publicCount: all.filter((e) => e.isPublic && !e.isDeleted).length,
      hiddenCount: all.filter((e) => !e.isPublic && !e.isDeleted).length,
      deletedCount: all.filter((e) => e.isDeleted).length
    };
  });

  constructor() {
    this.loadExams();
  }

  loadExams(): void {
    this.loading.set(true);
    this.error.set(null);
    this.examService
      .getAllExams()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (rows) => {
          this.exams.set(rows);
          this.loading.set(false);
        },
        error: (err) => {
          this.error.set(this.readError(err));
          this.loading.set(false);
        }
      });
  }

  onSearchChange(value: string): void {
    this.search.set(value);
  }

  onJlptFilterChange(value: string): void {
    this.jlptFilter.set(value === '' ? null : Number(value));
  }

  setStatusFilter(status: StatusFilter): void {
    this.statusFilter.set(status);
  }

  togglePublic(exam: AdminExamDto): void {
    this.busyId.set(exam.id);
    this.examService
      .setPublic(exam.id, !exam.isPublic)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.exams.update((list) => list.map((e) => (e.id === exam.id ? { ...e, isPublic: !exam.isPublic } : e)));
          this.busyId.set(null);
        },
        error: (err) => {
          this.error.set(this.readError(err));
          this.busyId.set(null);
        }
      });
  }

  confirmDelete(id: number): void {
    this.deleteConfirmId.set(id);
  }

  cancelDelete(): void {
    this.deleteConfirmId.set(null);
  }

  executeSoftDelete(id: number): void {
    this.busyId.set(id);
    this.examService
      .softDelete(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.exams.update((list) => list.map((e) => (e.id === id ? { ...e, isDeleted: true } : e)));
          this.deleteConfirmId.set(null);
          this.busyId.set(null);
        },
        error: (err) => {
          this.error.set(this.readError(err));
          this.deleteConfirmId.set(null);
          this.busyId.set(null);
        }
      });
  }

  restore(id: number): void {
    this.busyId.set(id);
    this.examService
      .restore(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.exams.update((list) => list.map((e) => (e.id === id ? { ...e, isDeleted: false } : e)));
          this.busyId.set(null);
        },
        error: (err) => {
          this.error.set(this.readError(err));
          this.busyId.set(null);
        }
      });
  }

  openDetail(exam: AdminExamDto): void {
    this.detailExam.set(exam);
    this.detailQuestions.set([]);
    this.detailLoading.set(true);
    this.examService
      .getExamQuestions(exam.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (qs) => {
          this.detailQuestions.set(qs);
          this.detailLoading.set(false);
        },
        error: (err) => {
          this.error.set(this.readError(err));
          this.detailLoading.set(false);
        }
      });
  }

  closeDetail(): void {
    this.detailExam.set(null);
    this.detailQuestions.set([]);
  }

  jlptLabel(level: number | null): string {
    return level === null ? '—' : `N${level}`;
  }

  timeLabel(seconds: number | null): string {
    if (!seconds || seconds <= 0) return 'Không giới hạn';
    const minutes = Math.round(seconds / 60);
    return `${minutes} phút`;
  }

  private readError(err: unknown): string {
    if (err && typeof err === 'object' && 'message' in err) {
      return String((err as { message: unknown }).message);
    }
    return 'Đã xảy ra lỗi khi tải đề kiểm tra.';
  }
}
