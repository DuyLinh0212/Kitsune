// frontend/Kitsune.Web.User/src/app/features/quizzes/pages/quiz-play/quiz-play.component.ts
import { Component, OnInit, OnDestroy, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { supabase } from '../../../../core/supabase/supabase.client';

// ─── Interfaces ────────────────────────────────────────────────────────────────

interface QuizQuestion {
  id: number;
  questionText: string;
  options: string[];
  correctAnswer: string;
  type: 'mc' | 'fill';
}

interface QuizMeta {
  id: number;
  title: string;
  timeLimitInSeconds: number;
  modes: string[];
  vocabIds: number[];
  kanjiIds: number[];
}

interface VocabData {
  id: number;
  word: string;
  pronunciation: string | null;
  meaning: string;
}

interface KanjiData {
  id: number;
  character: string;
  amHanViet: string;
  meaning: string;
  onyomi: string | null;
  kunyomi: string | null;
}

type QuizState = 'loading' | 'ready' | 'playing' | 'reviewing' | 'completed';

interface ToastMessage {
  text: string;
  type: 'success' | 'error' | 'info';
}

const VOCAB_MODES = ['MEAN_FROM_WORD', 'WORD_FROM_MEAN', 'FILL_BLANK'];
const KANJI_MODES = ['ON_KUN_READ', 'HAN_VIET', 'COMPOSE_KANJI'];

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickRandom<T>(arr: T[], count: number): T[] {
  return shuffleArray([...arr]).slice(0, count);
}

// ─── Component ─────────────────────────────────────────────────────────────────

@Component({
  selector: 'app-quiz-play',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './quiz-play.component.html',
  styleUrls: ['./quiz-play.component.css'],
  host: { style: 'display: block' },
})
export class QuizPlayComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  // ── State signals ────────────────────────────────────────────────────────────
  readonly quizState = signal<QuizState>('loading');
  readonly quizMeta = signal<QuizMeta | null>(null);
  readonly questions = signal<QuizQuestion[]>([]);
  readonly currentIndex = signal(0);
  readonly selectedOption = signal<string | null>(null);
  readonly fillAnswer = signal('');
  readonly isAnswerRevealed = signal(false);
  readonly correctCount = signal(0);
  readonly incorrectCount = signal(0);
  readonly timeLeft = signal(0);
  readonly toast = signal<ToastMessage | null>(null);
  readonly isSaving = signal(false);
  readonly startTime = signal<number>(0);
  readonly isGenerating = signal(false);

  // ── Computed ─────────────────────────────────────────────────────────────────
  readonly currentQuestion = computed<QuizQuestion | null>(() => {
    const qs = this.questions();
    const idx = this.currentIndex();
    return qs[idx] ?? null;
  });

  readonly totalQuestions = computed(() => this.questions().length);

  readonly estimatedQuestions = computed(() => {
    const meta = this.quizMeta();
    if (!meta) return 0;
    return meta.vocabIds.length + meta.kanjiIds.length || this.questions().length;
  });

  readonly progressPercent = computed(() => {
    const total = this.totalQuestions();
    if (total === 0) return 0;
    return Math.round((this.currentIndex() / total) * 100);
  });

  readonly scorePercent = computed(() => {
    const total = this.totalQuestions();
    if (total === 0) return 0;
    return Math.round((this.correctCount() / total) * 100);
  });

  readonly formattedTimeLeft = computed(() => {
    const t = this.timeLeft();
    const m = Math.floor(t / 60);
    const s = t % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  });

  readonly isTimerDanger = computed(() => this.timeLeft() > 0 && this.timeLeft() <= 30);

  readonly lastAnswerCorrect = computed(() => {
    const q = this.currentQuestion();
    const selected = this.selectedOption();
    if (!q || !this.isAnswerRevealed()) return null;
    if (q.type === 'fill') return null;
    return selected === q.correctAnswer;
  });

  readonly fillAnswerCorrect = signal<boolean | null>(null);
  readonly celebrationMode = computed(() => this.scorePercent() >= 80);

  readonly timeSpentSeconds = computed(() => {
    if (this.startTime() === 0) return 0;
    return Math.round((Date.now() - this.startTime()) / 1000);
  });

  private timerInterval: ReturnType<typeof setInterval> | null = null;
  private quizId = 0;
  // Cache raw items for re-generation on play-again
  private cachedVocabs: VocabData[] = [];
  private cachedKanjis: KanjiData[] = [];
  private cachedKanjiPool: KanjiData[] = [];

  // ─── Lifecycle ────────────────────────────────────────────────────────────────

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id || isNaN(Number(id))) {
      this.showToast('ID quiz không hợp lệ.', 'error');
      void this.router.navigate(['/my-quizzes']);
      return;
    }
    this.quizId = Number(id);
    void this.loadQuiz();
  }

  ngOnDestroy(): void {
    this.clearTimer();
  }

  // ─── Data Loading ─────────────────────────────────────────────────────────────

  private async loadQuiz(): Promise<void> {
    this.quizState.set('loading');
    try {
      const { data: raw, error } = await supabase
        .from('Quizzes')
        .select('Id, Title, Description, TimeLimitInSeconds')
        .eq('Id', this.quizId)
        .single();

      if (error) throw error;

      const quizRaw = raw as Record<string, unknown>;
      let modes: string[] = [];
      let vocabIds: number[] = [];
      let kanjiIds: number[] = [];
      const rawDesc = quizRaw['Description'] as string | null;

      if (rawDesc) {
        try {
          const parsed = JSON.parse(rawDesc) as {
            modes?: string[];
            vocabIds?: number[];
            kanjiIds?: number[];
          };
          modes = parsed.modes ?? [];
          vocabIds = parsed.vocabIds ?? [];
          kanjiIds = parsed.kanjiIds ?? [];
        } catch {
          modes = [];
        }
      }

      const meta: QuizMeta = {
        id: quizRaw['Id'] as number,
        title: quizRaw['Title'] as string,
        timeLimitInSeconds: (quizRaw['TimeLimitInSeconds'] as number) ?? 0,
        modes,
        vocabIds,
        kanjiIds,
      };
      this.quizMeta.set(meta);
      this.quizState.set('ready');
    } catch (err) {
      console.error('[QuizPlay] loadQuiz error:', err);
      this.showToast('Không thể tải quiz. Vui lòng thử lại.', 'error');
    }
  }

  // ─── Dynamic Question Generation ─────────────────────────────────────────────
  // Generates questions fresh on each play: random mode per item, random wrong options.

  private async generateDynamicQuestions(meta: QuizMeta): Promise<boolean> {
    this.isGenerating.set(true);
    try {
      const vocabModesAvail = meta.modes.filter(m => VOCAB_MODES.includes(m));
      const kanjiModesAvail = meta.modes.filter(m => KANJI_MODES.includes(m));
      const effectiveVocabModes = vocabModesAvail.length > 0 ? vocabModesAvail : ['MEAN_FROM_WORD'];
      const effectiveKanjiModes = kanjiModesAvail.length > 0 ? kanjiModesAvail : ['HAN_VIET'];

      // Fetch vocab items (use cache if available from prior play)
      if (this.cachedVocabs.length === 0 && meta.vocabIds.length > 0) {
        const { data, error } = await supabase
          .from('Vocabularies')
          .select('Id, Word, Pronunciation, Meaning')
          .in('Id', meta.vocabIds);
        if (error) throw error;
        this.cachedVocabs = (data ?? []).map((r: Record<string, unknown>) => ({
          id: r['Id'] as number,
          word: r['Word'] as string,
          pronunciation: (r['Pronunciation'] as string | null) ?? null,
          meaning: r['Meaning'] as string,
        }));
      }

      // Fetch kanji items
      if (this.cachedKanjis.length === 0 && meta.kanjiIds.length > 0) {
        const { data, error } = await supabase
          .from('Kanji')
          .select('Id, Character, AmHanViet, Meaning, Onyomi, Kunyomi')
          .in('Id', meta.kanjiIds);
        if (error) throw error;
        this.cachedKanjis = (data ?? []).map((r: Record<string, unknown>) => ({
          id: r['Id'] as number,
          character: r['Character'] as string,
          amHanViet: (r['AmHanViet'] as string) ?? '',
          meaning: (r['Meaning'] as string) ?? '',
          onyomi: (r['Onyomi'] as string | null) ?? null,
          kunyomi: (r['Kunyomi'] as string | null) ?? null,
        }));
      }

      // Fetch kanji pool for wrong options (if kanji questions needed)
      const needsPool = this.cachedKanjis.length > 0 || meta.modes.some(m => KANJI_MODES.includes(m));
      if (this.cachedKanjiPool.length === 0 && needsPool) {
        const { data } = await supabase
          .from('Kanji')
          .select('Id, Character, AmHanViet, Onyomi, Kunyomi')
          .limit(500);
        this.cachedKanjiPool = (data ?? []).map((r: Record<string, unknown>) => ({
          id: r['Id'] as number,
          character: r['Character'] as string,
          amHanViet: (r['AmHanViet'] as string) ?? '',
          meaning: '',
          onyomi: (r['Onyomi'] as string | null) ?? null,
          kunyomi: (r['Kunyomi'] as string | null) ?? null,
        }));
      }

      const questions = this.buildQuestions(
        this.cachedVocabs,
        this.cachedKanjis,
        effectiveVocabModes,
        effectiveKanjiModes,
        this.cachedKanjiPool
      );

      if (questions.length === 0) {
        this.showToast('Không thể tạo câu hỏi. Kiểm tra lại nguồn dữ liệu.', 'error');
        return false;
      }

      this.questions.set(questions);
      return true;
    } catch (err) {
      console.error('[QuizPlay] generateDynamicQuestions error:', err);
      this.showToast('Không thể tạo câu hỏi. Vui lòng thử lại.', 'error');
      return false;
    } finally {
      this.isGenerating.set(false);
    }
  }

  private buildQuestions(
    vocabs: VocabData[],
    kanjis: KanjiData[],
    vocabModes: string[],
    kanjiModes: string[],
    kanjiPool: KanjiData[]
  ): QuizQuestion[] {
    const allMeanings = vocabs.map(v => v.meaning);
    const allWords = vocabs.map(v => v.word);
    const allReadings = kanjiPool.map(k => k.onyomi ?? k.kunyomi ?? '').filter(Boolean);
    const allAmHanViet = kanjiPool.map(k => k.amHanViet).filter(Boolean);
    const allChars = kanjiPool.map(k => k.character).filter(Boolean);

    const questions: QuizQuestion[] = [];

    // 1 question per vocab — fresh random mode each call
    for (const vocab of shuffleArray([...vocabs])) {
      const mode = vocabModes[Math.floor(Math.random() * vocabModes.length)];

      if (mode === 'MEAN_FROM_WORD') {
        const wrongs = pickRandom(allMeanings.filter(m => m !== vocab.meaning), 3);
        if (wrongs.length < 3) {
          questions.push({ id: vocab.id, questionText: `Nhập từ tiếng Nhật: "${vocab.meaning}"`, options: [], correctAnswer: vocab.word, type: 'fill' });
        } else {
          questions.push({ id: vocab.id, questionText: vocab.word, options: shuffleArray([vocab.meaning, ...wrongs]), correctAnswer: vocab.meaning, type: 'mc' });
        }
      } else if (mode === 'WORD_FROM_MEAN') {
        const wrongs = pickRandom(allWords.filter(w => w !== vocab.word), 3);
        if (wrongs.length < 3) {
          questions.push({ id: vocab.id, questionText: `Nhập từ tiếng Nhật: "${vocab.meaning}"`, options: [], correctAnswer: vocab.word, type: 'fill' });
        } else {
          questions.push({ id: vocab.id, questionText: vocab.meaning, options: shuffleArray([vocab.word, ...wrongs]), correctAnswer: vocab.word, type: 'mc' });
        }
      } else { // FILL_BLANK
        questions.push({ id: vocab.id, questionText: `Nhập từ tiếng Nhật có nghĩa: ${vocab.meaning}`, options: [], correctAnswer: vocab.word, type: 'fill' });
      }
    }

    // 1 question per kanji — fresh random mode each call
    for (const kanji of shuffleArray([...kanjis])) {
      const mode = kanjiModes[Math.floor(Math.random() * kanjiModes.length)];

      if (mode === 'ON_KUN_READ') {
        const correctReading = kanji.onyomi ?? kanji.kunyomi ?? '';
        if (!correctReading) continue;
        const wrongs = pickRandom(allReadings.filter(r => r !== correctReading), 3);
        if (wrongs.length < 3) continue;
        questions.push({ id: kanji.id, questionText: kanji.character, options: shuffleArray([correctReading, ...wrongs]), correctAnswer: correctReading, type: 'mc' });
      } else if (mode === 'HAN_VIET') {
        if (!kanji.amHanViet) continue;
        const wrongs = pickRandom(allAmHanViet.filter(a => a !== kanji.amHanViet), 3);
        if (wrongs.length < 3) continue;
        questions.push({ id: kanji.id, questionText: kanji.character, options: shuffleArray([kanji.amHanViet, ...wrongs]), correctAnswer: kanji.amHanViet, type: 'mc' });
      } else { // COMPOSE_KANJI
        if (!kanji.amHanViet) continue;
        const wrongs = pickRandom(allChars.filter(c => c !== kanji.character), 3);
        if (wrongs.length < 3) continue;
        questions.push({ id: kanji.id, questionText: kanji.amHanViet, options: shuffleArray([kanji.character, ...wrongs]), correctAnswer: kanji.character, type: 'mc' });
      }
    }

    return questions;
  }

  // ─── Legacy: load pre-stored questions from QuizQuestions table ─────────────

  private async loadLegacyQuestions(): Promise<void> {
    const { data, error } = await supabase
      .from('QuizQuestions')
      .select('Id, QuestionText, OptionsJson, CorrectAnswer')
      .eq('QuizId', this.quizId)
      .order('Id');

    if (error) throw error;

    const rawQuestions = (data ?? []) as Record<string, unknown>[];
    const mapped: QuizQuestion[] = rawQuestions.map(r => {
      const rawOptions = r['OptionsJson'];
      const options: string[] = Array.isArray(rawOptions) ? (rawOptions as unknown[]).map(String) : [];
      return {
        id: r['Id'] as number,
        questionText: r['QuestionText'] as string,
        options,
        correctAnswer: r['CorrectAnswer'] as string,
        type: options.length > 0 ? 'mc' : 'fill',
      };
    });

    // Reshuffle options for existing MC questions to prevent answer memorization
    const allCorrect = mapped.map(q => q.correctAnswer);
    const reshuffled = shuffleArray(mapped).map(q => {
      if (q.type !== 'mc' || mapped.length < 4) return q;
      const wrongs = pickRandom(allCorrect.filter(a => a !== q.correctAnswer), 3);
      if (wrongs.length < 3) return q;
      return { ...q, options: shuffleArray([q.correctAnswer, ...wrongs]) };
    });

    this.questions.set(reshuffled);
  }

  // ─── Game Flow ────────────────────────────────────────────────────────────────

  async startQuiz(): Promise<void> {
    const meta = this.quizMeta();
    if (!meta) return;

    this.currentIndex.set(0);
    this.correctCount.set(0);
    this.incorrectCount.set(0);
    this.selectedOption.set(null);
    this.fillAnswer.set('');
    this.fillAnswerCorrect.set(null);
    this.isAnswerRevealed.set(false);

    // Generate or load questions
    const isDynamic = meta.vocabIds.length > 0 || meta.kanjiIds.length > 0;
    if (isDynamic) {
      const ok = await this.generateDynamicQuestions(meta);
      if (!ok) return;
    } else {
      try {
        await this.loadLegacyQuestions();
      } catch (err) {
        console.error(err);
        this.showToast('Không thể tải câu hỏi.', 'error');
        return;
      }
    }

    if (this.questions().length === 0) {
      this.showToast('Quiz này chưa có câu hỏi nào.', 'error');
      return;
    }

    this.startTime.set(Date.now());
    if (meta.timeLimitInSeconds > 0) {
      this.timeLeft.set(meta.timeLimitInSeconds);
      this.startTimer();
    }
    this.quizState.set('playing');
  }

  selectOption(option: string): void {
    if (this.quizState() !== 'playing' || this.isAnswerRevealed()) return;
    const q = this.currentQuestion();
    if (!q) return;

    this.selectedOption.set(option);
    this.isAnswerRevealed.set(true);

    if (option === q.correctAnswer) {
      this.correctCount.update(n => n + 1);
    } else {
      this.incorrectCount.update(n => n + 1);
    }

    this.quizState.set('reviewing');
    setTimeout(() => this.advanceQuestion(), 1200);
  }

  submitFillAnswer(): void {
    if (this.quizState() !== 'playing' || this.isAnswerRevealed()) return;
    const q = this.currentQuestion();
    if (!q) return;

    const userAnswer = this.fillAnswer().trim().toLowerCase();
    const correct = q.correctAnswer.trim().toLowerCase();
    const isCorrect = userAnswer === correct;

    this.fillAnswerCorrect.set(isCorrect);
    this.isAnswerRevealed.set(true);

    if (isCorrect) {
      this.correctCount.update(n => n + 1);
    } else {
      this.incorrectCount.update(n => n + 1);
    }

    this.quizState.set('reviewing');
    setTimeout(() => this.advanceQuestion(), 1500);
  }

  onFillKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.submitFillAnswer();
    }
  }

  private advanceQuestion(): void {
    const nextIndex = this.currentIndex() + 1;
    if (nextIndex >= this.totalQuestions()) {
      this.completeQuiz();
    } else {
      this.currentIndex.set(nextIndex);
      this.selectedOption.set(null);
      this.fillAnswer.set('');
      this.fillAnswerCorrect.set(null);
      this.isAnswerRevealed.set(false);
      this.quizState.set('playing');
    }
  }

  private completeQuiz(): void {
    this.clearTimer();
    this.quizState.set('completed');
    void this.saveAttempt();
  }

  async playAgain(): Promise<void> {
    this.clearTimer();
    // Re-generate for dynamic quizzes (fresh modes + fresh wrong options)
    // Re-shuffle for legacy quizzes
    await this.startQuiz();
  }

  backToQuizzes(): void {
    void this.router.navigate(['/my-quizzes']);
  }

  backFromReady(): void {
    void this.router.navigate(['/my-quizzes']);
  }

  // ─── Timer ────────────────────────────────────────────────────────────────────

  private startTimer(): void {
    this.clearTimer();
    this.timerInterval = setInterval(() => {
      const t = this.timeLeft();
      if (t <= 1) {
        this.timeLeft.set(0);
        this.clearTimer();
        this.completeQuiz();
      } else {
        this.timeLeft.set(t - 1);
      }
    }, 1000);
  }

  private clearTimer(): void {
    if (this.timerInterval !== null) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  // ─── Save Attempt ─────────────────────────────────────────────────────────────

  private async saveAttempt(): Promise<void> {
    if (this.isSaving()) return;
    this.isSaving.set(true);
    try {
      const userId = await this.getCurrentUserId();
      const total = this.totalQuestions();
      const correct = this.correctCount();
      const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;

      const { error } = await supabase.from('QuizAttempts').insert({
        QuizId: this.quizId,
        UserId: userId,
        AccuracyPercentage: accuracy,
        TimeSpentInSeconds: this.timeSpentSeconds(),
        CorrectAnswersCount: correct,
        TotalQuestionsCount: total,
        CreatedAt: new Date().toISOString(),
      });

      if (error) throw error;
    } catch (err) {
      console.error('[QuizPlay] saveAttempt error:', err);
      this.showToast('Không thể lưu kết quả. Dữ liệu có thể chưa được ghi nhận.', 'error');
    } finally {
      this.isSaving.set(false);
    }
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────────

  private async getCurrentUserId(): Promise<number> {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user?.email) throw new Error('Not authenticated');
    const { data: profile } = await supabase
      .from('Users')
      .select('Id')
      .eq('Email', data.user.email)
      .maybeSingle();
    if (!profile) throw new Error('User profile not found');
    return (profile as { Id: number }).Id;
  }

  private showToast(text: string, type: 'success' | 'error' | 'info'): void {
    this.toast.set({ text, type });
    setTimeout(() => this.toast.set(null), 3500);
  }

  getOptionClass(option: string): string {
    const q = this.currentQuestion();
    if (!q || !this.isAnswerRevealed()) return 'option-default';
    if (option === q.correctAnswer) return 'option-correct';
    if (option === this.selectedOption() && option !== q.correctAnswer) return 'option-incorrect';
    return 'option-default option-dimmed';
  }
}
