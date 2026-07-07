import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { FolderDto, FolderService } from '../../../../core/services/folder.service';
import {
  FolderSrsOverview,
  FolderSrsSession,
  SRSCardDto,
  SrsMode,
  SrsService,
} from '../../../../core/services/srs.service';

interface DashboardFolder extends FolderDto, FolderSrsOverview {}

interface QuizQuestion {
  mode: SrsMode;
  kind: 'mc' | 'fill';
  prompt: string;
  promptLabel: string;
  helper: string;
  options: string[];
  correctAnswer: string;
}

interface SessionStats {
  flashCompleted: number;
  quizCompleted: number;
  answersGiven: number;
  mistakes: number;
}

type StudyPhase = 'idle' | 'flashcard' | 'quiz' | 'summary';

interface LevelBucket {
  level: number;
  count: number;
  label: string;
  color: string;
}

@Component({
  selector: 'app-srs-review',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './srs-review.component.html',
  styleUrl: './srs-review.component.css',
})
export class SrsReviewComponent implements OnInit, OnDestroy {
  private readonly folderService = inject(FolderService);
  private readonly srsService = inject(SrsService);

  // ─── Core state ────────────────────────────────────────────────────────────
  readonly isLoading = signal(true);
  readonly isSwitchingFolder = signal<number | null>(null);
  readonly dashboardFolders = signal<DashboardFolder[]>([]);
  readonly activeFolderId = signal<number | null>(null);
  readonly activeSession = signal<FolderSrsSession | null>(null);
  readonly phase = signal<StudyPhase>('idle');

  // ─── Flashcard state ────────────────────────────────────────────────────────
  readonly flashQueue = signal<SRSCardDto[]>([]);
  readonly isCardFlipped = signal(false);
  readonly showStudyOverlay = signal(false);
  readonly showFolderDropdown = signal(false);

  // ─── Quiz state ─────────────────────────────────────────────────────────────
  readonly quizQueue = signal<SRSCardDto[]>([]);
  readonly currentQuestion = signal<QuizQuestion | null>(null);
  readonly selectedOption = signal<string | null>(null);
  readonly typedAnswer = signal('');
  readonly answerFeedback = signal<{ correct: boolean; message: string } | null>(null);

  // ─── Loading / feedback ─────────────────────────────────────────────────────
  readonly isSubmitting = signal(false);
  readonly toast = signal<{ type: 'success' | 'error'; message: string } | null>(null);

  // ─── Stats ──────────────────────────────────────────────────────────────────
  readonly stats = signal<SessionStats>({
    flashCompleted: 0,
    quizCompleted: 0,
    answersGiven: 0,
    mistakes: 0,
  });

  // ─── Countdown timer ────────────────────────────────────────────────────────
  readonly countdownDisplay = signal<string>('');
  private countdownInterval: ReturnType<typeof setInterval> | null = null;

  // ─── Computed ───────────────────────────────────────────────────────────────
  readonly currentFlashcard = computed(() => this.flashQueue()[0] ?? null);
  readonly currentQuizCard = computed(() => this.quizQueue()[0] ?? null);
  readonly currentCard = computed(() =>
    this.phase() === 'flashcard' ? this.currentFlashcard() : this.currentQuizCard()
  );
  readonly totalStudyUnits = computed(() => {
    const session = this.activeSession();
    if (!session) return 0;
    return session.flashcards.length + session.quizCards.length;
  });
  readonly completedUnits = computed(
    () => this.stats().flashCompleted + this.stats().quizCompleted
  );
  readonly progressPercent = computed(() => {
    const total = this.totalStudyUnits();
    if (total === 0) return 0;
    return Math.round((this.completedUnits() / total) * 100);
  });
  readonly activeFolder = computed(() =>
    this.dashboardFolders().find((folder) => folder.folderId === this.activeFolderId()) ?? null
  );
  readonly queueCount = computed(() =>
    this.phase() === 'flashcard' ? this.flashQueue().length : this.quizQueue().length
  );
  readonly accuracyPercent = computed(() => {
    const answers = this.stats().answersGiven;
    if (answers === 0) return 100;
    return Math.round(((answers - this.stats().mistakes) / answers) * 100);
  });

  /** Bar chart: count cards by boxLevel 0–7 (all 8 levels) */
  readonly levelDistribution = computed<LevelBucket[]>(() => {
    const session = this.activeSession();
    const cards = session?.cards ?? [];

    // 8 levels: 0=New, 1–4=Learning, 5–6=Reviewing, 7=Master
    const config: { level: number; label: string; color: string }[] = [
      { level: 0, label: 'Mới',    color: '#94a3b8' },
      { level: 1, label: 'Cấp 1', color: '#ef4444' },
      { level: 2, label: 'Cấp 2', color: '#f97316' },
      { level: 3, label: 'Cấp 3', color: '#f59e0b' },
      { level: 4, label: 'Cấp 4', color: '#22c55e' },
      { level: 5, label: 'Cấp 5', color: '#3b82f6' },
      { level: 6, label: 'Cấp 6', color: '#8b5cf6' },
      { level: 7, label: 'Master', color: '#ec4899' },
    ];
    return config.map((c) => ({
      ...c,
      count: cards.filter((card) => card.boxLevel === c.level).length,
    }));
  });

  readonly maxLevelCount = computed(() => {
    const dist = this.levelDistribution();
    return Math.max(1, ...dist.map((b) => b.count));
  });

  readonly totalDueCards = computed(() => {
    return this.dashboardFolders().reduce((sum, f) => sum + (f.dueCards ?? 0) + (f.newCards ?? 0), 0);
  });

  readonly nextDueAt = computed(() => {
    const folders = this.dashboardFolders();
    const dates = folders
      .map((f) => f.nextDueAt)
      .filter((d): d is string => !!d)
      .sort();
    return dates[0] ?? null;
  });

  constructor() {}

  ngOnInit(): void {
    void this.loadDashboard();
    this.startCountdownTimer();
  }

  ngOnDestroy(): void {
    this.stopCountdownTimer();
  }

  // ─── Dashboard ──────────────────────────────────────────────────────────────

  async loadDashboard(): Promise<void> {
    this.isLoading.set(true);
    try {
      const folders = await firstValueFrom(this.folderService.getFolders());
      const dashboards = await Promise.all(
        folders.map(async (folder) => {
          try {
            const overview = await firstValueFrom(this.srsService.getFolderOverview(folder.id));
            return {
              ...folder,
              ...overview,
            } satisfies DashboardFolder;
          } catch {
            return {
              ...folder,
              folderId: folder.id,
              folderName: folder.name,
              totalCards: 0,
              newCards: 0,
              dueCards: 0,
              learnedCards: 0,
              masteredCards: 0,
              nextDueAt: null,
              canSwitchFolder: true,
            } satisfies DashboardFolder;
          }
        })
      );

      this.dashboardFolders.set(dashboards);

      const preferredFolderId = this.srsService.getActiveFolderId() ?? dashboards[0]?.folderId ?? null;
      if (preferredFolderId) {
        await this.openFolder(preferredFolderId, false);
      } else {
        this.phase.set('idle');
      }
    } catch (error) {
      console.error(error);
      this.showToast('error', 'Không thể tải danh sách folder cho SRS.');
    } finally {
      this.isLoading.set(false);
    }
  }

  async openFolder(folderId: number, userInitiated = true): Promise<void> {
    if (this.isSubmitting()) return;

    this.isSwitchingFolder.set(folderId);
    try {
      const session = userInitiated
        ? await firstValueFrom(this.srsService.activateFolder(folderId))
        : await firstValueFrom(this.srsService.getFolderSession(folderId));

      if (!session) {
        this.activeFolderId.set(folderId);
        this.activeSession.set(null);
        this.phase.set('idle');
        return;
      }

      this.activeFolderId.set(folderId);
      this.activeSession.set(session);
      this.resetSession(session);
    } catch (error) {
      console.error(error);
      const message =
        error instanceof Error && error.message
          ? error.message
          : 'Không thể mở folder này cho SRS.';
      this.showToast('error', message);
    } finally {
      this.isSwitchingFolder.set(null);
    }
  }

  startStudy(): void {
    const session = this.activeSession();
    if (!session) return;
    this.showStudyOverlay.set(true);
  }

  closeStudy(): void {
    this.showStudyOverlay.set(false);
    void this.refreshDashboardFolders();
  }

  toggleFolderDropdown(): void {
    this.showFolderDropdown.update((v) => !v);
  }

  async selectFolder(folderId: number): Promise<void> {
    this.showFolderDropdown.set(false);
    await this.openFolder(folderId, true);
  }

  // ─── Flashcard ──────────────────────────────────────────────────────────────

  flipCard(): void {
    if (this.phase() !== 'flashcard') return;
    this.isCardFlipped.update((value) => !value);
  }

  async markFlashcardLearned(): Promise<void> {
    const card = this.currentFlashcard();
    if (!card || this.isSubmitting()) return;

    this.isSubmitting.set(true);
    try {
      await firstValueFrom(this.srsService.completeFlashcard(card.id));
      this.flashQueue.update((queue) => queue.slice(1));
      this.stats.update((stats) => ({
        ...stats,
        flashCompleted: stats.flashCompleted + 1,
      }));
      this.isCardFlipped.set(false);
      this.syncPhaseAfterFlash();
    } catch (error) {
      console.error(error);
      this.showToast('error', 'Không thể ghi nhận lượt học flashcard.');
    } finally {
      this.isSubmitting.set(false);
    }
  }

  /** Push current flashcard to end of queue ("xem lại") */
  reviewFlashcardAgain(): void {
    const queue = this.flashQueue();
    if (queue.length === 0) return;
    const [head, ...rest] = queue;
    this.flashQueue.set([...rest, head]);
    this.isCardFlipped.set(false);
    // If all cards are the same (only 1), just flip back
    if (rest.length === 0) {
      this.isCardFlipped.set(false);
    }
  }

  // ─── Quiz ───────────────────────────────────────────────────────────────────

  chooseOption(option: string): void {
    if (this.isSubmitting() || this.answerFeedback() || !this.currentQuestion()) return;
    this.selectedOption.set(option);
  }

  async submitQuizAnswer(): Promise<void> {
    const card = this.currentQuizCard();
    const question = this.currentQuestion();
    if (!card || !question || this.isSubmitting()) return;

    const answer = question.kind === 'mc' ? this.selectedOption()?.trim() ?? '' : '';

    if (!answer) return;

    const isCorrect = this.normalize(answer) === this.normalize(question.correctAnswer);
    this.isSubmitting.set(true);

    try {
      await firstValueFrom(this.srsService.submitQuizAnswer(card.id, isCorrect));
      this.answerFeedback.set({
        correct: isCorrect,
        message: isCorrect
          ? '✓ Chính xác! Thẻ này đã được lên lịch cho lần ôn tiếp theo.'
          : `✗ Chưa đúng. Đáp án đúng là "${question.correctAnswer}". Thẻ sẽ quay lại cuối hàng.`,
      });
      this.stats.update((stats) => ({
        flashCompleted: stats.flashCompleted,
        quizCompleted: stats.quizCompleted + (isCorrect ? 1 : 0),
        answersGiven: stats.answersGiven + 1,
        mistakes: stats.mistakes + (isCorrect ? 0 : 1),
      }));

      window.setTimeout(() => {
        this.advanceQuizQueue(isCorrect);
        this.isSubmitting.set(false);
      }, isCorrect ? 800 : 1400);
    } catch (error) {
      console.error(error);
      this.isSubmitting.set(false);
      this.showToast('error', 'Không thể lưu kết quả ôn tập.');
    }
  }

  async reloadActiveFolder(): Promise<void> {
    const folderId = this.activeFolderId();
    if (!folderId) return;
    await this.openFolder(folderId, false);
    await this.refreshDashboardFolders();
    this.showStudyOverlay.set(false);
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────

  formatNextDue(date: string | null): string {
    if (!date) return 'Chưa có lịch kế tiếp';
    const due = new Date(date);
    return due.toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  questionIndexLabel(): string {
    const total = this.totalStudyUnits();
    const done = this.completedUnits();
    return `${done + 1}/${Math.max(total, 1)}`;
  }

  isFolderLocked(folder: DashboardFolder): boolean {
    const active = this.activeFolder();
    if (!active) return false;
    if (active.folderId === folder.folderId) return false;
    return !active.canSwitchFolder;
  }

  getModeLabel(mode: SrsMode): string {
    const labels: Record<SrsMode, string> = {
      MEAN_FROM_WORD: 'Nghĩa của từ',
      WORD_FROM_MEAN: 'Từ từ nghĩa',
      FILL_BLANK: 'Điền từ',
      ON_KUN_READ: 'Cách đọc',
      HAN_VIET: 'Âm Hán Việt',
      COMPOSE_KANJI: 'Nhận dạng Kanji',
    };
    return labels[mode] ?? mode;
  }

  getModeColor(mode: SrsMode): string {
    const colors: Record<SrsMode, string> = {
      MEAN_FROM_WORD: '#3b82f6',
      WORD_FROM_MEAN: '#8b5cf6',
      FILL_BLANK: '#f59e0b',
      ON_KUN_READ: '#ef4444',
      HAN_VIET: '#ec4899',
      COMPOSE_KANJI: '#10b981',
    };
    return colors[mode] ?? '#6b7280';
  }

  getBarHeightPercent(bucket: LevelBucket): number {
    const max = this.maxLevelCount();
    if (max === 0) return 0;
    return Math.max(4, Math.round((bucket.count / max) * 100));
  }

  // ─── Private ─────────────────────────────────────────────────────────────────

  private resetSession(session: FolderSrsSession): void {
    this.flashQueue.set([...session.flashcards]);
    this.quizQueue.set([...session.quizCards]);
    this.stats.set({
      flashCompleted: 0,
      quizCompleted: 0,
      answersGiven: 0,
      mistakes: 0,
    });
    this.isCardFlipped.set(false);
    this.clearAnswerState();

    if (session.flashcards.length > 0) {
      this.phase.set('flashcard');
      return;
    }

    if (session.quizCards.length > 0) {
      this.phase.set('quiz');
      this.prepareNextQuestion();
      return;
    }

    this.phase.set('summary');
  }

  private syncPhaseAfterFlash(): void {
    if (this.flashQueue().length > 0) {
      this.phase.set('flashcard');
      return;
    }

    if (this.quizQueue().length > 0) {
      this.phase.set('quiz');
      this.prepareNextQuestion();
      return;
    }

    this.phase.set('summary');
    void this.refreshDashboardFolders();
  }

  private advanceQuizQueue(correct: boolean): void {
    const [head, ...rest] = this.quizQueue();
    if (!head) return;

    this.quizQueue.set(correct ? rest : [...rest, head]);
    this.clearAnswerState();

    if (this.quizQueue().length === 0) {
      this.phase.set('summary');
      void this.refreshDashboardFolders();
      return;
    }

    this.prepareNextQuestion();
  }

  private prepareNextQuestion(): void {
    const card = this.currentQuizCard();
    const session = this.activeSession();
    if (!card || !session) {
      this.currentQuestion.set(null);
      return;
    }

    const pool = session.cards;
    this.currentQuestion.set(this.buildQuestion(card, pool));
  }

  private buildQuestion(card: SRSCardDto, pool: SRSCardDto[]): QuizQuestion {
    const modes = card.type === 'vocabulary'
      ? this.shuffle<SrsMode>(['MEAN_FROM_WORD', 'WORD_FROM_MEAN', 'FILL_BLANK'])
      : this.shuffle<SrsMode>(['ON_KUN_READ', 'HAN_VIET', 'COMPOSE_KANJI']);

    // Always try to create a multiple-choice question
    for (const mode of modes) {
      const candidate = this.tryCreateQuestion(mode, card, pool);
      if (candidate) return candidate;
    }

    // Fallback: If somehow all modes fail (should not happen with our hardcoded fallbacks),
    // force a default MC question with hardcoded fallbacks.
    return card.type === 'vocabulary'
      ? {
          mode: 'WORD_FROM_MEAN',
          kind: 'mc',
          prompt: card.meaning,
          promptLabel: 'Chọn từ tiếng Nhật đúng với nghĩa này',
          helper: card.pronunciation ?? 'Chọn từ tương ứng',
          options: this.buildOptions(card.word, [], ['家族', '時間', '学校', '先生', '学生']),
          correctAnswer: card.word,
        }
      : {
          mode: 'HAN_VIET',
          kind: 'mc',
          prompt: card.character ?? '',
          promptLabel: 'Chọn âm Hán Việt của kanji này',
          helper: `Nét: ${card.strokeCount ?? '—'}`,
          options: this.buildOptions(card.amHanViet ?? 'Vô', [], ['Tâm', 'Hải', 'Hỏa', 'Thủy', 'Mộc']),
          correctAnswer: card.amHanViet ?? 'Vô',
        };
  }

  private tryCreateQuestion(
    mode: SrsMode,
    card: SRSCardDto,
    pool: SRSCardDto[]
  ): QuizQuestion | null {
    if (card.type === 'vocabulary') {
      if (mode === 'MEAN_FROM_WORD') {
        const fallbacks = ['Gia đình', 'Nhà', 'Người', 'Thời gian', 'Lịch', 'Sách', 'Trường học', 'Ngôn ngữ'];
        const options = this.buildOptions(
          card.meaning,
          pool.filter((item) => item.type === 'vocabulary').map((item) => item.meaning),
          fallbacks
        );
        return {
          mode,
          kind: 'mc',
          prompt: card.word,
          promptLabel: 'Chọn nghĩa đúng của từ này',
          helper: card.pronunciation ?? 'Dựa trên từ đang hiển thị.',
          options,
          correctAnswer: card.meaning,
        };
      }

      if (mode === 'WORD_FROM_MEAN' || mode === 'FILL_BLANK') {
        // We handle FILL_BLANK exactly like WORD_FROM_MEAN now (multiple choice)
        const fallbacks = ['家族', '家', '人', '時間', 'カレンダー', '本', '学校', '言語'];
        const options = this.buildOptions(
          card.word,
          pool.filter((item) => item.type === 'vocabulary').map((item) => item.word),
          fallbacks
        );
        return {
          mode: mode === 'FILL_BLANK' ? 'WORD_FROM_MEAN' : mode,
          kind: 'mc',
          prompt: card.meaning,
          promptLabel: 'Chọn từ tiếng Nhật đúng',
          helper: card.pronunciation ? `Gợi ý: ${card.pronunciation}` : 'Ưu tiên đúng chính tả.',
          options,
          correctAnswer: card.word,
        };
      }
    }

    if (mode === 'ON_KUN_READ') {
      const correct = card.onyomi ?? card.kunyomi;
      if (!correct) return null;
      const readings = pool
        .filter((item) => item.type === 'kanji')
        .map((item) => item.onyomi ?? item.kunyomi)
        .filter((value): value is string => !!value);
      const fallbacks = ['ジン', 'カ', 'ガク', 'ゴ', 'ホン', 'セイ', 'セン', 'ニチ', 'ゲツ', 'スイ'];
      const options = this.buildOptions(correct, readings, fallbacks);
      return {
        mode,
        kind: 'mc',
        prompt: card.character ?? '',
        promptLabel: 'Chọn cách đọc đúng của kanji này',
        helper: 'Dùng onyomi nếu có, nếu không thì dùng kunyomi.',
        options,
        correctAnswer: correct,
      };
    }

    if (mode === 'HAN_VIET') {
      const correct = card.amHanViet;
      if (!correct) return null;
      const poolItems = pool
        .filter((item) => item.type === 'kanji')
        .map((item) => item.amHanViet)
        .filter((value): value is string => !!value);
      const fallbacks = ['Nhân', 'Gia', 'Học', 'Ngữ', 'Bản', 'Sinh', 'Tiên', 'Nhật', 'Nguyệt', 'Hỏa'];
      const options = this.buildOptions(correct, poolItems, fallbacks);
      return {
        mode,
        kind: 'mc',
        prompt: card.character ?? '',
        promptLabel: 'Chọn âm Hán Việt đúng',
        helper: `Nét: ${card.strokeCount ?? '—'}`,
        options,
        correctAnswer: correct,
      };
    }

    if (mode === 'COMPOSE_KANJI') {
      const correct = card.character;
      if (!correct) return null;
      const poolItems = pool
        .filter((item) => item.type === 'kanji')
        .map((item) => item.character)
        .filter((value): value is string => !!value);
      const fallbacks = ['人', '家', '学', '語', '本', '生', '先', '日', '月', '火'];
      const options = this.buildOptions(correct, poolItems, fallbacks);
      return {
        mode,
        kind: 'mc',
        prompt: card.amHanViet ?? card.meaning,
        promptLabel: 'Chọn đúng kanji theo âm Hán Việt',
        helper: card.meaning,
        options,
        correctAnswer: correct,
      };
    }

    return null;
  }

  private buildOptions(correct: string, pool: string[], fallbacks: string[]): string[] {
    let unique = [...new Set(pool.filter((value) => value && value !== correct))];
    
    // If not enough unique options in pool, pull from fallbacks
    if (unique.length < 3) {
      const additional = fallbacks.filter((value) => value !== correct && !unique.includes(value));
      unique = [...unique, ...additional];
    }
    
    const wrongs = this.shuffle(unique).slice(0, 3);
    
    // Even after fallbacks if we still don't have 3 wrongs, just duplicate some or use empty strings (should rarely happen with good fallbacks)
    while (wrongs.length < 3) {
      wrongs.push(`Lựa chọn ${wrongs.length + 1}`);
    }

    return this.shuffle([correct, ...wrongs]);
  }

  private shuffle<T>(items: T[]): T[] {
    const clone = [...items];
    for (let index = clone.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [clone[index], clone[swapIndex]] = [clone[swapIndex], clone[index]];
    }
    return clone;
  }

  private normalize(value: string): string {
    return value.trim().toLocaleLowerCase();
  }

  private clearAnswerState(): void {
    this.selectedOption.set(null);
    this.typedAnswer.set('');
    this.answerFeedback.set(null);
  }

  private startCountdownTimer(): void {
    this.updateCountdown();
    this.countdownInterval = setInterval(() => {
      this.updateCountdown();
    }, 1000);
  }

  private stopCountdownTimer(): void {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }
  }

  private updateCountdown(): void {
    const nextDue = this.nextDueAt();
    if (!nextDue) {
      this.countdownDisplay.set('');
      return;
    }

    const diff = new Date(nextDue).getTime() - Date.now();
    if (diff <= 0) {
      this.countdownDisplay.set('Đến hạn rồi!');
      return;
    }

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    this.countdownDisplay.set(
      `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
    );
  }

  private async refreshDashboardFolders(): Promise<void> {
    const folders = this.dashboardFolders();
    if (folders.length === 0) return;

    const refreshed = await Promise.all(
      folders.map(async (folder) => {
        const overview = await firstValueFrom(this.srsService.getFolderOverview(folder.folderId));
        return { ...folder, ...overview } satisfies DashboardFolder;
      })
    );
    this.dashboardFolders.set(refreshed);
  }

  private showToast(type: 'success' | 'error', message: string): void {
    this.toast.set({ type, message });
    setTimeout(() => this.toast.set(null), 3200);
  }
}
