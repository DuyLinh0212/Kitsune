// Kitsune.Web/Kitsune.Web.User/src/app/features/topics/pages/lesson-detail/lesson-detail.component.ts
import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { LessonDetail } from '../../../../core/models/topic.model';
import { TopicService } from '../../../../core/services/topic.service';
import { TtsService } from '../../../../core/services/tts.service';

interface PendingLessonProgress {
  lessonId: number;
  completedItemCount: number;
  totalItems: number;
  lastItemId: number;
}

type CompletionSyncState = 'idle' | 'saving' | 'saved' | 'error';

@Component({
  selector: 'app-lesson-detail',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './lesson-detail.component.html',
  styleUrl: './lesson-detail.component.css',
})
export class LessonDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly topicService = inject(TopicService);
  private readonly destroyRef = inject(DestroyRef);
  readonly tts = inject(TtsService);

  readonly lesson = signal<LessonDetail | null>(null);
  readonly activeIndex = signal(0);
  readonly isLoading = signal(true);
  readonly isSaving = signal(false);
  readonly isCompleted = signal(false);
  readonly completionSyncState = signal<CompletionSyncState>('idle');
  readonly errorMessage = signal('');
  private pendingProgress: PendingLessonProgress | null = null;
  private failedProgress: PendingLessonProgress | null = null;
  private progressSaveInFlight = false;
  readonly activeItem = computed(() => this.lesson()?.items[this.activeIndex()] ?? null);
  readonly progressPercent = computed(() => {
    const total = this.lesson()?.items.length ?? 0;
    return total === 0 ? 0 : Math.round(((this.activeIndex() + 1) / total) * 100);
  });

  ngOnInit(): void {
    const lessonId = Number(this.route.snapshot.paramMap.get('lessonId'));
    if (!Number.isFinite(lessonId)) {
      this.errorMessage.set('Bài học không hợp lệ.');
      this.isLoading.set(false);
      return;
    }
    this.topicService.getLesson(lessonId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (lesson) => {
        this.lesson.set(lesson);
        this.activeIndex.set(Math.min(lesson.completedItemCount, Math.max(0, lesson.items.length - 1)));
        this.isLoading.set(false);
      },
      error: () => {
        this.errorMessage.set('Không thể tải nội dung bài học.');
        this.isLoading.set(false);
      },
    });
  }

  previous(): void {
    this.activeIndex.update((index) => Math.max(0, index - 1));
  }

  next(): void {
    const lesson = this.lesson();
    if (!lesson) return;
    const completed = Math.min(this.activeIndex() + 1, lesson.items.length);
    const completedItem = this.activeItem();
    if (!completedItem) return;

    const isLastItem = completed === lesson.items.length;

    if (!isLastItem) {
      this.activeIndex.update((index) => index + 1);
    } else {
      this.isCompleted.set(true);
      this.completionSyncState.set('saving');
    }

    this.queueProgressSave({
      lessonId: lesson.id,
      completedItemCount: completed,
      totalItems: lesson.items.length,
      lastItemId: completedItem.id,
    });
  }

  retryCompletion(): void {
    if (!this.failedProgress) return;

    this.completionSyncState.set('saving');
    this.queueProgressSave(this.failedProgress);
  }

  private queueProgressSave(progress: PendingLessonProgress): void {
    this.failedProgress = null;
    this.pendingProgress = progress;
    this.isSaving.set(true);
    this.flushProgressSave();
  }

  private flushProgressSave(): void {
    if (this.progressSaveInFlight || !this.pendingProgress) return;
    const progress = this.pendingProgress;
    this.pendingProgress = null;
    this.progressSaveInFlight = true;
    this.topicService
      .updateProgress(
        progress.lessonId,
        progress.completedItemCount,
        progress.totalItems,
        progress.lastItemId,
      )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.progressSaveInFlight = false;
          if (progress.completedItemCount === progress.totalItems) {
            this.completionSyncState.set('saved');
          }
          if (this.pendingProgress) this.flushProgressSave();
          else this.isSaving.set(false);
        },
        error: () => {
          this.progressSaveInFlight = false;
          this.failedProgress = progress;
          if (this.pendingProgress) this.flushProgressSave();
          else {
            if (progress.completedItemCount === progress.totalItems) {
              this.completionSyncState.set('error');
            } else {
              this.errorMessage.set('Chưa thể đồng bộ tiến độ. Lượt tiếp theo sẽ thử lại.');
            }
            this.isSaving.set(false);
          }
        },
      });
  }

  speak(): void {
    const item = this.activeItem();
    if (item) this.tts.speakVocabulary(item.word, item.pronunciation);
  }
}
