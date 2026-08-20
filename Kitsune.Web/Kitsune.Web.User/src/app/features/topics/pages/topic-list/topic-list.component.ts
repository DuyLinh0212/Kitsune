// Kitsune.Web/Kitsune.Web.User/src/app/features/topics/pages/topic-list/topic-list.component.ts
import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { LessonSummary, TopicSummary } from '../../../../core/models/topic.model';
import { TopicService } from '../../../../core/services/topic.service';

@Component({
  selector: 'app-topic-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './topic-list.component.html',
  styleUrl: './topic-list.component.css',
})
export class TopicListComponent implements OnInit {
  private readonly topicService = inject(TopicService);
  private readonly destroyRef = inject(DestroyRef);

  readonly topics = signal<TopicSummary[]>([]);
  readonly lessons = signal<LessonSummary[]>([]);
  readonly activeTopicId = signal<number | null>(null);
  readonly isLoading = signal(true);
  readonly errorMessage = signal('');
  readonly activeTopic = computed(() => this.topics().find((topic) => topic.id === this.activeTopicId()) ?? null);

  ngOnInit(): void {
    this.topicService.getTopics().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (topics) => {
        this.topics.set(topics);
        const firstId = topics[0]?.id ?? null;
        this.activeTopicId.set(firstId);
        if (firstId != null) this.loadLessons(firstId);
        else this.isLoading.set(false);
      },
      error: () => {
        this.errorMessage.set('Không thể tải chủ đề. Hãy kiểm tra migration v3.0.0.');
        this.isLoading.set(false);
      },
    });
  }

  selectTopic(topicId: number): void {
    if (topicId === this.activeTopicId()) return;
    this.activeTopicId.set(topicId);
    this.loadLessons(topicId);
  }

  lessonState(lesson: LessonSummary): string {
    if (lesson.progressPercent >= 100) return 'Đã hoàn thành';
    if (lesson.progressPercent > 0) return 'Đang học';
    return 'Sẵn sàng';
  }

  private loadLessons(topicId: number): void {
    this.isLoading.set(true);
    this.topicService.getLessons(topicId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (lessons) => {
        this.lessons.set(lessons);
        this.isLoading.set(false);
      },
      error: () => {
        this.errorMessage.set('Không thể tải danh sách bài học.');
        this.isLoading.set(false);
      },
    });
  }
}
