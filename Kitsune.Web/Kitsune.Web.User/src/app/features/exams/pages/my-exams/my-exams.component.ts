import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { ExamService, ExamSummaryDto } from '../../../../core/services/exam.service';
import { LoadingFoxComponent } from '../../../../shared/components/loading-fox/loading-fox.component';

@Component({
  selector: 'app-my-exams',
  standalone: true,
  imports: [CommonModule, RouterLink, LoadingFoxComponent],
  templateUrl: './my-exams.component.html',
  styleUrl: './my-exams.component.css'
})
export class MyExamsComponent implements OnInit {
  private readonly examService = inject(ExamService);
  private readonly destroyRef = inject(DestroyRef);

  readonly exams = signal<ExamSummaryDto[]>([]);
  readonly isLoading = signal<boolean>(true);
  readonly errorMsg = signal<string | null>(null);
  readonly busyId = signal<number | null>(null);
  readonly deleteConfirmId = signal<number | null>(null);
  readonly toast = signal<{ type: 'success' | 'error'; message: string } | null>(null);

  ngOnInit(): void {
    this.load();
  }

  private load(): void {
    this.isLoading.set(true);
    this.errorMsg.set(null);
    this.examService
      .listMine()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (rows) => {
          this.exams.set(rows);
          this.isLoading.set(false);
        },
        error: (err) => {
          this.errorMsg.set((err as { message?: string })?.message ?? 'Không thể tải đề của bạn.');
          this.isLoading.set(false);
        }
      });
  }

  togglePublic(exam: ExamSummaryDto): void {
    this.busyId.set(exam.id);
    this.examService
      .setPublic(exam.id, !exam.isPublic)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.exams.update((list) => list.map((e) => (e.id === exam.id ? { ...e, isPublic: !exam.isPublic } : e)));
          this.busyId.set(null);
          this.showToast('success', exam.isPublic ? 'Đã ẩn đề khỏi cộng đồng.' : 'Đề đã được công khai.');
        },
        error: (err) => {
          this.busyId.set(null);
          this.showToast('error', (err as { message?: string })?.message ?? 'Thao tác thất bại.');
        }
      });
  }

  confirmDelete(id: number): void {
    this.deleteConfirmId.set(id);
  }

  cancelDelete(): void {
    this.deleteConfirmId.set(null);
  }

  executeDelete(id: number): void {
    this.busyId.set(id);
    this.examService
      .softDelete(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.exams.update((list) => list.filter((e) => e.id !== id));
          this.deleteConfirmId.set(null);
          this.busyId.set(null);
          this.showToast('success', 'Đã xóa đề.');
        },
        error: (err) => {
          this.deleteConfirmId.set(null);
          this.busyId.set(null);
          this.showToast('error', (err as { message?: string })?.message ?? 'Xóa thất bại.');
        }
      });
  }

  jlptLabel(level: number | null): string {
    return level === null ? 'Chưa phân loại' : `N${level}`;
  }

  timeLabel(seconds: number | null): string {
    if (!seconds || seconds <= 0) return 'Không giới hạn';
    return `${Math.round(seconds / 60)} phút`;
  }

  private showToast(type: 'success' | 'error', message: string): void {
    this.toast.set({ type, message });
    setTimeout(() => this.toast.set(null), 3000);
  }
}
