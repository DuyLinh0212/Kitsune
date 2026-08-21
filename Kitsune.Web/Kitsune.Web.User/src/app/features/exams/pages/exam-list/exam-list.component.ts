import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

import { ExamService, ExamSummaryDto } from '../../../../core/services/exam.service';
import { LoadingFoxComponent } from '../../../../shared/components/loading-fox/loading-fox.component';

@Component({
  selector: 'app-exam-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, LoadingFoxComponent],
  templateUrl: './exam-list.component.html',
  styleUrl: './exam-list.component.css'
})
export class ExamListComponent implements OnInit {
  private readonly examService = inject(ExamService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly searchSubject = new Subject<string>();

  readonly searchQuery = signal<string>('');
  readonly jlptLevel = signal<number | null>(null);
  readonly exams = signal<ExamSummaryDto[]>([]);
  readonly isLoading = signal<boolean>(true);
  readonly errorMsg = signal<string | null>(null);

  readonly jlptLevels: readonly number[] = [5, 4, 3, 2, 1];

  ngOnInit(): void {
    this.load();
    this.searchSubject
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.load());
  }

  onSearchInput(value: string): void {
    this.searchQuery.set(value);
    this.searchSubject.next(value);
  }

  onSelectLevel(level: number | null): void {
    this.jlptLevel.set(this.jlptLevel() === level ? null : level);
    this.load();
  }

  private load(): void {
    this.isLoading.set(true);
    this.errorMsg.set(null);
    this.examService
      .listPublic(this.searchQuery(), this.jlptLevel())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (rows) => {
          this.exams.set(rows);
          this.isLoading.set(false);
        },
        error: (err) => {
          this.errorMsg.set((err as { message?: string })?.message ?? 'Không thể tải danh sách đề.');
          this.isLoading.set(false);
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
}
