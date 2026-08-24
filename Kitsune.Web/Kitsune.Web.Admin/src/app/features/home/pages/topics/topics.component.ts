// Kitsune.Web/Kitsune.Web.Admin/src/app/features/home/pages/topics/topics.component.ts
import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AdminTopic, AiTopicPlan, CatalogItemType, FolderLearningItem, TopicAdminService } from '../../../../core/services/topic-admin.service';

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
  readonly lessonItems = signal<FolderLearningItem[]>([]);
  readonly catalogItems = signal<FolderLearningItem[]>([]);
  readonly catalogItemType = signal<CatalogItemType>('vocabulary');
  readonly selectedTopicId = signal<number | null>(null);
  readonly selectedLessonId = signal<number | null>(null);
  readonly selectedCatalogKeys = signal<Set<string>>(new Set());
  readonly loading = signal(true);
  readonly lessonItemsLoading = signal(false);
  readonly lessonItemsError = signal('');
  readonly catalogLoading = signal(false);
  readonly busy = signal(false);
  readonly message = signal('');
  readonly aiError = signal('');
  readonly aiPlan = signal<AiTopicPlan | null>(null);
  readonly activeTopic = computed(() => this.topics().find((topic) => topic.id === this.selectedTopicId()) ?? null);
  readonly activeLesson = computed(() => this.activeTopic()?.lessons.find((lesson) => lesson.id === this.selectedLessonId()) ?? null);
  readonly activeTopicHasPublishedLessons = computed(() => this.activeTopic()?.lessons.some((lesson) => lesson.isPublished) ?? false);
  readonly lessonVocabularyCount = computed(() => this.lessonItems().filter((item) => item.itemType === 'vocabulary').length);
  readonly lessonKanjiCount = computed(() => this.lessonItems().filter((item) => item.itemType === 'kanji').length);

  topicTitle = '';
  topicDescription = '';
  topicJlpt: number | null = null;
  editTopicTitle = '';
  editTopicDescription = '';
  editTopicJlpt: number | null = null;
  lessonTitle = '';
  lessonDescription = '';
  lessonMinutes = 10;
  editLessonTitle = '';
  editLessonDescription = '';
  editLessonMinutes = 10;
  aiTopic = '';
  aiLessonCount = 5;
  aiVocabularyPerLesson = 20;
  catalogQuery = '';

  ngOnInit(): void { this.reload(); }

  reload(): void {
    this.loading.set(true);
    const preferredTopicId = this.selectedTopicId();
    const preferredLessonId = this.selectedLessonId();
    this.service.getTopics().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (topics) => {
        this.topics.set(topics);
        const topicId = topics.some((topic) => topic.id === preferredTopicId) ? preferredTopicId : topics[0]?.id ?? null;
        this.selectedTopicId.set(topicId);
        const activeTopic = topics.find((topic) => topic.id === topicId);
        const lessonId = activeTopic?.lessons.some((lesson) => lesson.id === preferredLessonId) ? preferredLessonId : activeTopic?.lessons[0]?.id ?? null;
        this.selectedLessonId.set(lessonId);
        this.loadSelectedLessonItems(lessonId);
        this.loading.set(false);
      },
      error: () => { this.message.set('Không thể tải Topics. Hãy chạy migration 005.'); this.loading.set(false); },
    });
  }

  selectTopic(topicId: number): void {
    this.selectedTopicId.set(topicId);
    const topic = this.topics().find((entry) => entry.id === topicId);
    this.selectedLessonId.set(topic?.lessons[0]?.id ?? null);
    this.loadSelectedLessonItems(this.selectedLessonId());
    this.resetCatalogPicker();
    this.syncEditors();
  }

  selectLesson(lessonId: number): void {
    this.selectedLessonId.set(lessonId);
    this.loadSelectedLessonItems(lessonId);
    this.resetCatalogPicker();
    this.syncEditors();
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
        this.selectedLessonId.set(lesson.id); this.loadSelectedLessonItems(lesson.id); this.lessonTitle = ''; this.lessonDescription = ''; this.busy.set(false); this.message.set('Đã tạo bài học nháp.');
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
    if (!lesson || !topic || lesson.isPublished || this.busy()) return;
    this.busy.set(true);
    this.service.setLessonPublished(lesson.id, !lesson.isPublished).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.topics.update((topics) => topics.map((entry) => entry.id === topic.id
          ? { ...entry, lessons: entry.lessons.map((item) => item.id === lesson.id ? { ...item, isPublished: !item.isPublished } : item) }
          : entry));
        this.busy.set(false);
        this.message.set('Đã xuất bản bài học. Nội dung bài học đã được khóa, chỉ còn có thể đổi tên.');
      },
      error: () => { this.busy.set(false); this.message.set('Không thể đổi trạng thái bài học.'); },
    });
  }

  saveTopic(): void {
    const topic = this.activeTopic();
    if (!topic || !this.editTopicTitle.trim() || this.busy()) return;
    this.busy.set(true);
    const description = topic.isPublished ? topic.description : this.editTopicDescription;
    const jlptLevel = topic.isPublished ? topic.jlptLevel : this.editTopicJlpt;
    this.service.updateTopic(topic.id, this.editTopicTitle, description, jlptLevel).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.topics.update((topics) => topics.map((item) => item.id === topic.id ? { ...item, title: this.editTopicTitle.trim(), description: description.trim(), jlptLevel } : item));
        this.busy.set(false);
        this.message.set(topic.isPublished ? 'Đã đổi tên chủ đề đã xuất bản.' : 'Đã lưu thay đổi chủ đề.');
      },
      error: () => { this.busy.set(false); this.message.set('Không thể lưu thay đổi chủ đề.'); },
    });
  }

  saveLesson(): void {
    const lesson = this.activeLesson();
    const topic = this.activeTopic();
    if (!lesson || !topic || !this.editLessonTitle.trim() || this.busy()) return;
    this.busy.set(true);
    const description = lesson.isPublished ? lesson.description : this.editLessonDescription;
    const minutes = lesson.isPublished ? lesson.estimatedMinutes : this.editLessonMinutes;
    this.service.updateLesson(lesson.id, this.editLessonTitle, description, minutes).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.topics.update((topics) => topics.map((entry) => entry.id === topic.id ? {
          ...entry,
          lessons: entry.lessons.map((item) => item.id === lesson.id ? { ...item, title: this.editLessonTitle.trim(), description: description.trim(), estimatedMinutes: minutes } : item),
        } : entry));
        this.busy.set(false);
        this.message.set(lesson.isPublished ? 'Đã đổi tên bài học đã xuất bản.' : 'Đã lưu thay đổi bài học.');
      },
      error: () => { this.busy.set(false); this.message.set('Không thể lưu thay đổi bài học.'); },
    });
  }

  removeLessonItem(item: FolderLearningItem): void {
    const lesson = this.activeLesson();
    if (!lesson || lesson.isPublished || !item.lessonItemId || this.busy()) return;
    this.busy.set(true);
    this.service.removeLessonItem(item.lessonItemId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => { this.busy.set(false); this.message.set('Đã gỡ học liệu khỏi bài học nháp.'); this.reload(); },
      error: () => { this.busy.set(false); this.message.set('Không thể gỡ học liệu khỏi bài học.'); },
    });
  }

  deleteTopic(): void {
    const topic = this.activeTopic();
    if (!topic || topic.isPublished || this.busy()) return;
    if (this.activeTopicHasPublishedLessons()) {
      this.message.set('Không thể xóa Topic khi vẫn có Lesson đã xuất bản.');
      return;
    }
    const lessonLabel = topic.lessons.length === 1 ? '1 Lesson nháp' : `${topic.lessons.length} Lesson nháp`;
    if (!window.confirm(`Xóa vĩnh viễn Topic “${topic.title}” và ${lessonLabel}? Toàn bộ học liệu, tiến độ Lesson và liên kết SRS thuộc các Lesson này cũng sẽ bị xóa. Thao tác không thể hoàn tác.`)) return;

    this.busy.set(true);
    this.service.deleteTopic(topic.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.selectedTopicId.set(null);
        this.selectedLessonId.set(null);
        this.resetCatalogPicker();
        this.lessonItems.set([]);
        this.busy.set(false);
        this.message.set(`Đã xóa vĩnh viễn Topic “${topic.title}” cùng ${lessonLabel}.`);
        this.reload();
      },
      error: (error: unknown) => {
        this.busy.set(false);
        this.message.set(this.readErrorMessage(error, 'Không thể xóa Topic.'));
      },
    });
  }

  deleteLesson(): void {
    const lesson = this.activeLesson();
    if (!lesson || lesson.isPublished || this.busy()) return;
    if (!window.confirm(`Xóa vĩnh viễn Lesson “${lesson.title}”? Toàn bộ học liệu, tiến độ Lesson và liên kết SRS thuộc bài này cũng sẽ bị xóa. Thao tác không thể hoàn tác.`)) return;

    this.busy.set(true);
    this.service.deleteLesson(lesson.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.selectedLessonId.set(null);
        this.resetCatalogPicker();
        this.lessonItems.set([]);
        this.busy.set(false);
        this.message.set(`Đã xóa vĩnh viễn Lesson “${lesson.title}”.`);
        this.reload();
      },
      error: (error: unknown) => {
        this.busy.set(false);
        this.message.set(this.readErrorMessage(error, 'Không thể xóa Lesson.'));
      },
    });
  }

  setCatalogItemType(itemType: CatalogItemType): void {
    if (this.catalogItemType() === itemType) return;
    this.catalogItemType.set(itemType);
    this.catalogItems.set([]);
    this.selectedCatalogKeys.set(new Set());
    if (this.catalogQuery.trim()) this.searchCatalog();
  }

  searchCatalog(): void {
    if (!this.activeLesson()) { this.message.set('Hãy chọn một bài học trước.'); return; }
    if (!this.catalogQuery.trim() || this.catalogLoading()) return;
    this.catalogLoading.set(true);
    this.selectedCatalogKeys.set(new Set());
    this.service.searchCatalog(this.catalogItemType(), this.catalogQuery).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (items) => {
        this.catalogItems.set(items);
        this.catalogLoading.set(false);
        if (!items.length) this.message.set('Không tìm thấy học liệu phù hợp.');
      },
      error: () => { this.catalogLoading.set(false); this.message.set('Không thể tìm trong kho học liệu.'); },
    });
  }

  toggleCatalogItem(key: string): void {
    this.selectedCatalogKeys.update((keys) => { const next = new Set(keys); next.has(key) ? next.delete(key) : next.add(key); return next; });
  }

  toggleAllCatalogItems(): void {
    this.selectedCatalogKeys.set(this.selectedCatalogKeys().size === this.catalogItems().length
      ? new Set()
      : new Set(this.catalogItems().map((item) => item.key)));
  }

  addCatalogItems(): void {
    const lessonId = this.selectedLessonId();
    if (!lessonId || this.activeLesson()?.isPublished || this.busy()) return;
    const selected = this.catalogItems().filter((item) => this.selectedCatalogKeys().has(item.key));
    if (!selected.length) { this.message.set('Hãy chọn ít nhất một từ vựng hoặc Kanji.'); return; }
    this.busy.set(true);
    this.service.addCatalogItems(lessonId, selected).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (count) => {
        this.busy.set(false);
        this.selectedCatalogKeys.set(new Set());
        this.message.set(count > 0 ? `Đã thêm ${count} mục; Kanji trong từ vựng đã được gắn tự động và không trùng.` : 'Các mục đã có sẵn trong bài học.');
        this.reload();
      },
      error: () => { this.busy.set(false); this.message.set('Không thể thêm học liệu vào bài học.'); },
    });
  }

  generateAi(): void {
    if (!this.aiTopic.trim() || this.busy()) return;
    this.aiLessonCount = this.clampAiLessonCount(this.aiLessonCount);
    this.aiVocabularyPerLesson = this.clampAiVocabularyPerLesson(this.aiVocabularyPerLesson);
    this.busy.set(true); this.aiPlan.set(null); this.aiError.set(''); this.message.set('Gemini đang tạo Topic, Lessons và đối chiếu Kanji…');
    this.service.generateAndSaveTopic(this.aiTopic, this.aiLessonCount, this.aiVocabularyPerLesson).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: ({ topic, plan }) => {
        this.aiPlan.set(plan);
        this.aiError.set('');
        this.selectedTopicId.set(topic.id);
        this.selectedLessonId.set(topic.lessons[0]?.id ?? null);
        this.busy.set(false);
        this.message.set(`Đã tạo chủ đề “${topic.title}” cùng ${topic.lessons.length} bài học ở trạng thái nháp.`);
        this.reload();
      },
      error: (error: unknown) => {
        this.busy.set(false);
        this.message.set('');
        this.aiError.set(`Không thể tạo lộ trình AI: ${this.readErrorMessage(error, 'Không nhận được nội dung lỗi từ máy chủ.')}`);
      },
    });
  }

  private resetCatalogPicker(): void {
    this.catalogItems.set([]);
    this.selectedCatalogKeys.set(new Set());
  }

  private clampAiLessonCount(value: number): number {
    return Math.min(20, Math.max(1, Math.floor(Number(value) || 1)));
  }

  private clampAiVocabularyPerLesson(value: number): number {
    return Math.min(50, Math.max(1, Math.floor(Number(value) || 20)));
  }

  private syncEditors(): void {
    const topic = this.activeTopic();
    this.editTopicTitle = topic?.title ?? '';
    this.editTopicDescription = topic?.description ?? '';
    this.editTopicJlpt = topic?.jlptLevel ?? null;
    const lesson = this.activeLesson();
    this.editLessonTitle = lesson?.title ?? '';
    this.editLessonDescription = lesson?.description ?? '';
    this.editLessonMinutes = lesson?.estimatedMinutes ?? 10;
  }

  private loadSelectedLessonItems(lessonId: number | null): void {
    this.lessonItems.set([]);
    this.lessonItemsError.set('');
    if (lessonId === null) {
      this.lessonItemsLoading.set(false);
      return;
    }
    this.lessonItemsLoading.set(true);
    this.service.getLessonItems(lessonId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (items) => {
        if (this.selectedLessonId() !== lessonId) return;
        this.lessonItems.set(items);
        this.topics.update((topics) => topics.map((topic) => ({
          ...topic,
          lessons: topic.lessons.map((lesson) =>
            lesson.id === lessonId ? { ...lesson, itemCount: items.length } : lesson
          ),
        })));
        this.lessonItemsLoading.set(false);
        this.syncEditors();
      },
      error: () => {
        if (this.selectedLessonId() !== lessonId) return;
        this.lessonItemsError.set('Không thể tải nội dung bài học. Hãy thử chọn lại bài này.');
        this.lessonItemsLoading.set(false);
      },
    });
  }

  private readErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof Error && error.message.trim()) return error.message;
    return fallback;
  }
}
