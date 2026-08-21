// Kitsune.Web/Kitsune.Web.Admin/src/app/features/home/pages/topics/topics.component.ts
import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AdminTopic, AiTopicPlan, CatalogItemType, FolderLearningItem, FolderOption, TopicAdminService } from '../../../../core/services/topic-admin.service';

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
  readonly lessonItems = signal<FolderLearningItem[]>([]);
  readonly catalogItems = signal<FolderLearningItem[]>([]);
  readonly catalogItemType = signal<CatalogItemType>('vocabulary');
  readonly selectedTopicId = signal<number | null>(null);
  readonly selectedLessonId = signal<number | null>(null);
  readonly selectedFolderId = signal<number | null>(null);
  readonly selectedFolderKeys = signal<Set<string>>(new Set());
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
  readonly lessonVocabularyCount = computed(() => this.lessonItems().filter((item) => item.itemType === 'vocabulary').length);
  readonly lessonKanjiCount = computed(() => this.lessonItems().filter((item) => item.itemType === 'kanji').length);

  topicTitle = '';
  topicDescription = '';
  topicJlpt: number | null = null;
  lessonTitle = '';
  lessonDescription = '';
  lessonMinutes = 10;
  aiTopic = '';
  aiLessonCount = 5;
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
    this.service.getFolders().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({ next: (folders) => this.folders.set(folders) });
  }

  selectTopic(topicId: number): void {
    this.selectedTopicId.set(topicId);
    const topic = this.topics().find((entry) => entry.id === topicId);
    this.selectedLessonId.set(topic?.lessons[0]?.id ?? null);
    this.loadSelectedLessonItems(this.selectedLessonId());
    this.resetCatalogPicker();
  }

  selectLesson(lessonId: number): void {
    this.selectedLessonId.set(lessonId);
    this.loadSelectedLessonItems(lessonId);
    this.resetCatalogPicker();
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
    this.selectedFolderKeys.set(new Set());
    if (!this.selectedFolderId()) { this.folderItems.set([]); return; }
    this.service.getFolderItems(folderId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (items) => this.folderItems.set(items),
      error: () => this.message.set('Không thể đọc nội dung folder.'),
    });
  }

  toggleItem(key: string): void {
    this.selectedFolderKeys.update((keys) => { const next = new Set(keys); next.has(key) ? next.delete(key) : next.add(key); return next; });
  }

  toggleAll(): void {
    this.selectedFolderKeys.set(this.selectedFolderKeys().size === this.folderItems().length ? new Set() : new Set(this.folderItems().map((item) => item.key)));
  }

  importSelected(): void {
    const lessonId = this.selectedLessonId();
    const folderId = this.selectedFolderId();
    if (!lessonId || !folderId || this.busy()) return;
    const selected = this.folderItems().filter((item) => this.selectedFolderKeys().has(item.key));
    if (!selected.length) { this.message.set('Hãy chọn ít nhất một từ hoặc Kanji.'); return; }
    this.busy.set(true);
    this.service.importFolderItems(lessonId, folderId, selected).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (count) => { this.busy.set(false); this.selectedFolderKeys.set(new Set()); this.message.set(`Đã thêm ${count} mục, gồm cả Kanji tự động từ từ vựng.`); this.reload(); },
      error: () => { this.busy.set(false); this.message.set('Không thể chuyển mục; có thể mục đã tồn tại trong bài.'); },
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
    if (!lessonId || this.busy()) return;
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
    this.busy.set(true); this.aiPlan.set(null); this.aiError.set(''); this.message.set('Gemini đang tạo Topic, Lessons và đối chiếu Kanji…');
    this.service.generateAndSaveTopic(this.aiTopic, this.aiLessonCount).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
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
        this.lessonItemsLoading.set(false);
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
