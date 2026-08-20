// Kitsune.Web/Kitsune.Web.Admin/src/app/features/home/pages/topics/topics.component.ts
import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AdminTopic, AiTopicPlan, FolderLearningItem, FolderOption, TopicAdminService } from '../../../../core/services/topic-admin.service';

@Component({
  selector: 'app-topic-management',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './topics.component.html',
  styleUrl: './topics.component.css',
})
export class TopicManagementComponent implements OnInit {
  private readonly service = inject(TopicAdminService);
  private readonly destroyRef = inject(DestroyRef);

  readonly topics = signal<AdminTopic[]>([]);
  readonly folders = signal<FolderOption[]>([]);
  readonly folderItems = signal<FolderLearningItem[]>([]);
  readonly selectedTopicId = signal<number | null>(null);
  readonly selectedLessonId = signal<number | null>(null);
  readonly selectedFolderId = signal<number | null>(null);
  readonly selectedKeys = signal<Set<string>>(new Set());
  readonly loading = signal(true);
  readonly busy = signal(false);
  readonly message = signal('');
  readonly aiPlan = signal<AiTopicPlan | null>(null);
  readonly activeTopic = computed(() => this.topics().find((topic) => topic.id === this.selectedTopicId()) ?? null);
  readonly activeLesson = computed(() => this.activeTopic()?.lessons.find((lesson) => lesson.id === this.selectedLessonId()) ?? null);

  topicTitle = '';
  topicDescription = '';
  topicJlpt: number | null = null;
  lessonTitle = '';
  lessonDescription = '';
  lessonMinutes = 10;
  aiTopic = '';
  aiLessonCount = 5;

  ngOnInit(): void { this.reload(); }

  reload(): void {
    this.loading.set(true);
    this.service.getTopics().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (topics) => {
        this.topics.set(topics);
        this.selectedTopicId.set(this.selectedTopicId() ?? topics[0]?.id ?? null);
        this.selectedLessonId.set(this.activeTopic()?.lessons[0]?.id ?? null);
        this.loading.set(false);
      },
      error: () => { this.message.set('Không thể tải Topics. Hãy chạy migration 005.'); this.loading.set(false); },
    });
    this.service.getFolders().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({ next: (folders) => this.folders.set(folders) });
  }

  selectTopic(topicId: number): void {
    this.selectedTopicId.set(topicId);
    const topic = this.topics().find((entry) => entry.id === topicId);
    this.selectedLessonId.set(topic?.lessons[0]?.id ?? null);
  }

  createTopic(): void {
    if (!this.topicTitle.trim() || this.busy()) return;
    this.busy.set(true);
    this.service.createTopic(this.topicTitle, this.topicDescription, this.topicJlpt).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (topic) => { this.topicTitle = ''; this.topicDescription = ''; this.topics.update((topics) => [topic, ...topics]); this.selectTopic(topic.id); this.busy.set(false); this.message.set('Đã tạo chủ đề nháp.'); },
      error: () => { this.busy.set(false); this.message.set('Không thể tạo chủ đề.'); },
    });
  }

  createLesson(): void {
    const topic = this.activeTopic();
    if (!topic || !this.lessonTitle.trim() || this.busy()) return;
    this.busy.set(true);
    this.service.createLesson(topic.id, this.lessonTitle, this.lessonDescription, this.lessonMinutes, topic.lessons.length).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (lesson) => {
        this.topics.update((topics) => topics.map((entry) => entry.id === topic.id ? { ...entry, lessons: [...entry.lessons, lesson] } : entry));
        this.selectedLessonId.set(lesson.id); this.lessonTitle = ''; this.lessonDescription = ''; this.busy.set(false); this.message.set('Đã tạo bài học nháp.');
      },
      error: () => { this.busy.set(false); this.message.set('Không thể tạo bài học.'); },
    });
  }

  toggleTopicPublished(): void {
    const topic = this.activeTopic();
    if (!topic || this.busy()) return;
    this.busy.set(true);
    this.service.setTopicPublished(topic.id, !topic.isPublished).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.topics.update((topics) => topics.map((entry) => entry.id === topic.id ? { ...entry, isPublished: !entry.isPublished } : entry));
        this.busy.set(false);
        this.message.set(topic.isPublished ? 'Đã đưa chủ đề về bản nháp.' : 'Đã xuất bản chủ đề.');
      },
      error: () => { this.busy.set(false); this.message.set('Không thể đổi trạng thái chủ đề.'); },
    });
  }

  toggleLessonPublished(): void {
    const lesson = this.activeLesson();
    const topic = this.activeTopic();
    if (!lesson || !topic || this.busy()) return;
    this.busy.set(true);
    this.service.setLessonPublished(lesson.id, !lesson.isPublished).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.topics.update((topics) => topics.map((entry) => entry.id === topic.id
          ? { ...entry, lessons: entry.lessons.map((item) => item.id === lesson.id ? { ...item, isPublished: !item.isPublished } : item) }
          : entry));
        this.busy.set(false);
        this.message.set(lesson.isPublished ? 'Đã đưa bài học về bản nháp.' : 'Đã xuất bản bài học.');
      },
      error: () => { this.busy.set(false); this.message.set('Không thể đổi trạng thái bài học.'); },
    });
  }

  loadFolderItems(value: string): void {
    const folderId = Number(value);
    this.selectedFolderId.set(Number.isFinite(folderId) && folderId > 0 ? folderId : null);
    this.selectedKeys.set(new Set());
    if (!this.selectedFolderId()) { this.folderItems.set([]); return; }
    this.service.getFolderItems(folderId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (items) => this.folderItems.set(items),
      error: () => this.message.set('Không thể đọc nội dung folder.'),
    });
  }

  toggleItem(key: string): void {
    this.selectedKeys.update((keys) => { const next = new Set(keys); next.has(key) ? next.delete(key) : next.add(key); return next; });
  }

  toggleAll(): void {
    this.selectedKeys.set(this.selectedKeys().size === this.folderItems().length ? new Set() : new Set(this.folderItems().map((item) => item.key)));
  }

  importSelected(): void {
    const lessonId = this.selectedLessonId();
    const folderId = this.selectedFolderId();
    if (!lessonId || !folderId || this.busy()) return;
    const selected = this.folderItems().filter((item) => this.selectedKeys().has(item.key));
    if (!selected.length) { this.message.set('Hãy chọn ít nhất một từ hoặc Kanji.'); return; }
    this.busy.set(true);
    this.service.importFolderItems(lessonId, folderId, selected).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (count) => { this.busy.set(false); this.selectedKeys.set(new Set()); this.message.set(`Đã chuyển ${count} mục vào bài học.`); this.reload(); },
      error: () => { this.busy.set(false); this.message.set('Không thể chuyển mục; có thể mục đã tồn tại trong bài.'); },
    });
  }

  generateAi(): void {
    if (!this.aiTopic.trim() || this.busy()) return;
    this.busy.set(true); this.aiPlan.set(null); this.message.set('Gemini đang đối chiếu kho từ vựng…');
    this.service.generatePlan(this.aiTopic, this.aiLessonCount).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (plan) => { this.aiPlan.set(plan); this.busy.set(false); this.message.set('Đã tạo bản nháp. Kiểm tra trước khi lưu.'); },
      error: () => { this.busy.set(false); this.message.set('Không thể gọi AI. Hãy deploy Edge Function và cấu hình GEMINI_API_KEY.'); },
    });
  }

  saveAi(): void {
    const plan = this.aiPlan();
    if (!plan || !this.aiTopic.trim() || this.busy()) return;
    this.busy.set(true);
    this.service.savePlan(this.aiTopic, plan).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => { this.busy.set(false); this.aiPlan.set(null); this.message.set('Đã lưu lộ trình AI ở trạng thái nháp.'); this.reload(); },
      error: () => { this.busy.set(false); this.message.set('Lưu lộ trình AI chưa hoàn tất. Kiểm tra dữ liệu và thử lại.'); },
    });
  }
}
