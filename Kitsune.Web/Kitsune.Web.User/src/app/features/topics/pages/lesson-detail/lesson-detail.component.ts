// Kitsune.Web/Kitsune.Web.User/src/app/features/topics/pages/lesson-detail/lesson-detail.component.ts
import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { LessonDetail } from '../../../../core/models/topic.model';
import { TopicService } from '../../../../core/services/topic.service';
import { TtsService } from '../../../../core/services/tts.service';

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
  readonly errorMessage = signal('');
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
    if (!lesson || this.isSaving()) return;
    const completed = Math.min(this.activeIndex() + 1, lesson.items.length);
    this.isSaving.set(true);
    this.topicService.updateProgress(lesson.id, completed, lesson.items.length, this.activeItem()?.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          if (this.activeIndex() < lesson.items.length - 1) this.activeIndex.update((index) => index + 1);
          this.isSaving.set(false);
        },
        error: () => {
          this.errorMessage.set('Chưa thể lưu tiến độ. Vui lòng thử lại.');
          this.isSaving.set(false);
        },
      });
  }

  speak(): void {
    const item = this.activeItem();
    if (item) this.tts.speak(item.word);
  }
}
