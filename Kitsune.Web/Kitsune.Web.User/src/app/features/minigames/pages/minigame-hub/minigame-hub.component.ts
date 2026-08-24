// Kitsune.Web/Kitsune.Web.User/src/app/features/minigames/pages/minigame-hub/minigame-hub.component.ts
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, DestroyRef, OnDestroy, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { GameVocabulary, MinigameType } from '../../../../core/models/topic.model';
import { TopicService } from '../../../../core/services/topic.service';
import { TtsService } from '../../../../core/services/tts.service';

interface GameDefinition {
  type: MinigameType;
  eyebrow: string;
  title: string;
  description: string;
  duration: number;
  accent: string;
}

interface MemoryCard {
  key: string;
  vocabularyId: number;
  value: string;
  side: 'word' | 'reading';
  revealed: boolean;
  matched: boolean;
}

interface BubbleOption {
  item: GameVocabulary;
  left: number;
  size: number;
  durationSeconds: number;
  delaySeconds: number;
  drift: number;
}

interface ShiritoriTurn {
  speaker: 'Kitsune' | 'Bạn';
  word: string;
  reading: string;
}

@Component({
  selector: 'app-minigame-hub',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './minigame-hub.component.html',
  styleUrl: './minigame-hub.component.css',
})
export class MinigameHubComponent implements OnDestroy {
  private readonly topicService = inject(TopicService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly platformId = inject(PLATFORM_ID);
  readonly tts = inject(TtsService);

  readonly games: GameDefinition[] = [
    { type: 'BUBBLE_POP', eyebrow: '60 giây', title: 'Bong bóng từ vựng', description: 'Chạm đúng từ đang được gọi tên. Sai sẽ mất 2 giây.', duration: 60, accent: '#d85b3f' },
    { type: 'KANA_PATH', eyebrow: 'Nối âm', title: 'Kéo từ thành nghĩa', description: 'Ghép các ô kana thành cách đọc của từ Kanji.', duration: 60, accent: '#5e7b63' },
    { type: 'MEMORY_MATCH', eyebrow: '10 cặp · 90 giây', title: 'Siêu trí nhớ', description: 'Lật và ghép cặp Kanji với cách đọc Hiragana.', duration: 90, accent: '#3d3565' },
    { type: 'LISTENING', eyebrow: 'Nghe trước, nhìn sau', title: 'Nghe đoán từ', description: 'Nghe phát âm và chọn đúng nghĩa trong bốn đáp án.', duration: 60, accent: '#a96c35' },
    { type: 'SHIRITORI', eyebrow: 'Đấu với Kitsune · 10 giây/lượt', title: 'Nối từ với máy', description: 'Nhập từ Kanji bắt đầu bằng hai âm cuối mà Kitsune đưa ra.', duration: 10, accent: '#287f88' },
  ];

  readonly screen = signal<'hub' | 'loading' | 'playing' | 'finished'>('hub');
  readonly activeGame = signal<GameDefinition | null>(null);
  readonly vocabulary = signal<GameVocabulary[]>([]);
  readonly currentIndex = signal(0);
  readonly score = signal(0);
  readonly correctCount = signal(0);
  readonly wrongCount = signal(0);
  readonly secondsLeft = signal(0);
  readonly feedback = signal<'correct' | 'wrong' | null>(null);
  readonly memoryCards = signal<MemoryCard[]>([]);
  readonly selectedMemoryKeys = signal<string[]>([]);
  readonly kanaSelection = signal<string[]>([]);
  readonly selectedKanaIndexes = signal<number[]>([]);
  readonly shiritoriHistory = signal<ShiritoriTurn[]>([]);
  readonly shiritoriInput = signal('');
  readonly shiritoriRequired = signal('');
  readonly shiritoriTurn = signal<'user' | 'bot'>('user');
  readonly shiritoriError = signal<string | null>(null);
  readonly currentWord = computed(() => this.vocabulary()[this.currentIndex() % Math.max(1, this.vocabulary().length)] ?? null);
  readonly bubbleOptions = computed<BubbleOption[]>(() => {
    const layouts = [
      { left: 5, size: 106, durationSeconds: 8.8, delaySeconds: -1.8, drift: 22 },
      { left: 17, size: 142, durationSeconds: 11.4, delaySeconds: -7.1, drift: -18 },
      { left: 30, size: 92, durationSeconds: 7.9, delaySeconds: -3.5, drift: 28 },
      { left: 42, size: 158, durationSeconds: 12.6, delaySeconds: -9.4, drift: -25 },
      { left: 57, size: 116, durationSeconds: 9.6, delaySeconds: -5.9, drift: 16 },
      { left: 68, size: 98, durationSeconds: 8.4, delaySeconds: -2.6, drift: -20 },
      { left: 78, size: 154, durationSeconds: 11.8, delaySeconds: -8.2, drift: 24 },
      { left: 89, size: 122, durationSeconds: 10.2, delaySeconds: -4.7, drift: -15 },
    ];
    return this.pickOptions(8).map((item, index) => ({ item, ...layouts[index] }));
  });
  readonly listeningOptions = computed(() => this.pickOptions(4).map((item) => item.meaning));
  readonly kanaOptions = computed(() => {
    const chars = [...(this.currentWord()?.pronunciation ?? '')];
    const decoys = [...'あいうえおかきくけこさしすせそたちつてとなにぬねの'];
    return [...chars, ...decoys.sort(() => Math.random() - .5).slice(0, Math.max(4, 12 - chars.length))].sort(() => Math.random() - .5);
  });
  readonly elapsedSeconds = computed(() => Math.max(0, (this.activeGame()?.duration ?? 0) - this.secondsLeft()));
  private timerId: ReturnType<typeof setInterval> | null = null;

  start(game: GameDefinition): void {
    this.activeGame.set(game);
    this.screen.set('loading');
    const vocabularyLimit = game.type === 'MEMORY_MATCH' ? 10 : game.type === 'SHIRITORI' ? 120 : 30;
    this.topicService.getGameVocabulary(vocabularyLimit)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (items) => {
          this.vocabulary.set(items.filter((item) => item.word && item.pronunciation && item.meaning));
          this.resetGame(game);
        },
        error: () => this.screen.set('hub'),
      });
  }

  leaveGame(): void {
    this.stopTimer();
    this.screen.set('hub');
    this.activeGame.set(null);
  }

  chooseBubble(item: GameVocabulary): void {
    const target = this.currentWord();
    if (!target) return;
    this.resolveAnswer(item.id === target.id, true);
  }

  chooseListening(meaning: string): void {
    this.resolveAnswer(meaning === this.currentWord()?.meaning, false);
  }

  playAudio(): void {
    const target = this.currentWord();
    if (target) this.tts.speakVocabulary(target.word, target.pronunciation);
  }

  selectKana(char: string, index: number): void {
    if (this.selectedKanaIndexes().includes(index)) return;
    this.selectedKanaIndexes.update((indexes) => [...indexes, index]);
    this.kanaSelection.update((selection) => [...selection, char]);
  }

  isKanaUsed(index: number): boolean {
    return this.selectedKanaIndexes().includes(index);
  }

  undoKana(): void {
    this.selectedKanaIndexes.update((indexes) => indexes.slice(0, -1));
    this.kanaSelection.update((selection) => selection.slice(0, -1));
  }

  submitKana(): void {
    const target = this.currentWord();
    if (!target) return;
    this.resolveAnswer(this.kanaSelection().join('') === target.pronunciation, false);
    this.kanaSelection.set([]);
    this.selectedKanaIndexes.set([]);
  }

  onShiritoriInput(value: string): void {
    this.shiritoriInput.set(value);
    this.shiritoriError.set(null);
  }

  submitShiritori(): void {
    if (this.shiritoriTurn() !== 'user' || this.screen() !== 'playing') return;
    const input = this.shiritoriInput().trim();
    if (!this.containsKanji(input)) {
      this.shiritoriError.set('Hãy nhập một từ có Kanji.');
      return;
    }
    const usedIds = new Set(this.shiritoriHistory().map((turn) => turn.word));
    const match = this.vocabulary().find((item) => item.word === input && !usedIds.has(item.word));
    if (!match) {
      this.shiritoriError.set('Từ này chưa có trong kho từ vựng hoặc đã được dùng.');
      return;
    }
    const reading = this.normalizeReading(match.pronunciation);
    if (!reading.startsWith(this.shiritoriRequired())) {
      this.shiritoriError.set(`Từ phải bắt đầu bằng “${this.shiritoriRequired()}”.`);
      return;
    }

    this.shiritoriHistory.update((history) => [
      ...history,
      { speaker: 'Bạn', word: match.word, reading: match.pronunciation },
    ]);
    this.correctCount.update((count) => count + 1);
    this.score.update((score) => score + 150 + this.secondsLeft() * 5);
    this.shiritoriInput.set('');
    this.shiritoriTurn.set('bot');

    const required = this.readingTail(reading);
    const nextUsed = new Set(this.shiritoriHistory().map((turn) => turn.word));
    const botChoices = this.vocabulary().filter((item) =>
      this.containsKanji(item.word)
      && !nextUsed.has(item.word)
      && this.normalizeReading(item.pronunciation).startsWith(required)
      && !this.normalizeReading(item.pronunciation).endsWith('ん'),
    );
    const botWord = botChoices[Math.floor(Math.random() * botChoices.length)];
    if (!botWord) {
      this.score.update((score) => score + 500);
      this.finishGame();
      return;
    }
    if (isPlatformBrowser(this.platformId)) {
      window.setTimeout(() => {
        if (this.screen() !== 'playing') return;
        this.shiritoriHistory.update((history) => [
          ...history,
          { speaker: 'Kitsune', word: botWord.word, reading: botWord.pronunciation },
        ]);
        this.shiritoriRequired.set(this.readingTail(botWord.pronunciation));
        this.shiritoriTurn.set('user');
        this.secondsLeft.set(10);
        this.tts.speakVocabulary(botWord.word, botWord.pronunciation);
      }, 450);
    }
  }

  flipMemory(card: MemoryCard): void {
    if (card.matched || card.revealed || this.selectedMemoryKeys().length >= 2) return;
    this.memoryCards.update((cards) => cards.map((entry) => entry.key === card.key ? { ...entry, revealed: true } : entry));
    const keys = [...this.selectedMemoryKeys(), card.key];
    this.selectedMemoryKeys.set(keys);
    if (keys.length !== 2) return;
    const selected = this.memoryCards().filter((entry) => keys.includes(entry.key));
    const matched = selected.length === 2 && selected[0].vocabularyId === selected[1].vocabularyId;
    if (matched) {
      this.correctCount.update((value) => value + 1);
      this.score.update((value) => value + 120);
      this.memoryCards.update((cards) => cards.map((entry) => keys.includes(entry.key) ? { ...entry, matched: true } : entry));
      this.selectedMemoryKeys.set([]);
      if (this.memoryCards().every((entry) => entry.matched)) this.finishGame();
      return;
    }
    this.wrongCount.update((value) => value + 1);
    if (isPlatformBrowser(this.platformId)) {
      window.setTimeout(() => {
        this.memoryCards.update((cards) => cards.map((entry) => keys.includes(entry.key) ? { ...entry, revealed: false } : entry));
        this.selectedMemoryKeys.set([]);
      }, 650);
    }
  }

  ngOnDestroy(): void {
    this.stopTimer();
  }

  private resetGame(game: GameDefinition): void {
    this.currentIndex.set(0);
    this.score.set(0);
    this.correctCount.set(0);
    this.wrongCount.set(0);
    this.secondsLeft.set(game.duration);
    this.feedback.set(null);
    this.kanaSelection.set([]);
    this.selectedKanaIndexes.set([]);
    this.selectedMemoryKeys.set([]);
    if (game.type === 'MEMORY_MATCH') this.buildMemoryCards();
    if (game.type === 'SHIRITORI') this.startShiritori();
    this.screen.set('playing');
    if (game.type === 'LISTENING' && isPlatformBrowser(this.platformId)) window.setTimeout(() => this.playAudio(), 350);
    this.startTimer();
  }

  private startTimer(): void {
    this.stopTimer();
    if (!isPlatformBrowser(this.platformId)) return;
    this.timerId = setInterval(() => {
      this.secondsLeft.update((value) => Math.max(0, value - 1));
      if (this.secondsLeft() <= 0) this.finishGame();
    }, 1000);
  }

  private stopTimer(): void {
    if (this.timerId != null) clearInterval(this.timerId);
    this.timerId = null;
  }

  private resolveAnswer(correct: boolean, penalizeTime: boolean): void {
    if (this.feedback() != null) return;
    this.feedback.set(correct ? 'correct' : 'wrong');
    if (correct) {
      this.correctCount.update((value) => value + 1);
      this.score.update((value) => value + 100 + this.secondsLeft());
    } else {
      this.wrongCount.update((value) => value + 1);
      if (penalizeTime) this.secondsLeft.update((value) => Math.max(0, value - 2));
    }
    if (!isPlatformBrowser(this.platformId)) return;
    window.setTimeout(() => {
      this.currentIndex.update((value) => value + 1);
      this.feedback.set(null);
      if (this.activeGame()?.type === 'LISTENING') this.playAudio();
    }, 430);
  }

  private finishGame(): void {
    if (this.screen() !== 'playing') return;
    this.stopTimer();
    this.screen.set('finished');
    const type = this.activeGame()?.type;
    if (!type) return;
    this.topicService.recordGame(type, this.score(), this.correctCount(), this.wrongCount(), this.elapsedSeconds())
      .pipe(takeUntilDestroyed(this.destroyRef)).subscribe({ error: () => void 0 });
  }

  private pickOptions(count: number): GameVocabulary[] {
    const target = this.currentWord();
    if (!target) return [];
    const alternatives = this.vocabulary().filter((item) => item.id !== target.id).sort(() => Math.random() - .5).slice(0, count - 1);
    return [target, ...alternatives].sort(() => Math.random() - .5);
  }

  private buildMemoryCards(): void {
    const cards = this.vocabulary().slice(0, 10).flatMap((item): MemoryCard[] => [
      { key: `${item.id}-word`, vocabularyId: item.id, value: item.word, side: 'word', revealed: false, matched: false },
      { key: `${item.id}-reading`, vocabularyId: item.id, value: item.pronunciation, side: 'reading', revealed: false, matched: false },
    ]);
    this.memoryCards.set(cards.sort(() => Math.random() - .5));
  }

  private startShiritori(): void {
    const choices = this.vocabulary().filter((item) =>
      this.containsKanji(item.word)
      && this.normalizeReading(item.pronunciation).length >= 2
      && !this.normalizeReading(item.pronunciation).endsWith('ん'),
    );
    const first = choices[Math.floor(Math.random() * choices.length)];
    if (!first) {
      this.shiritoriError.set('Kho từ vựng chưa đủ dữ liệu Kanji để bắt đầu.');
      return;
    }
    this.shiritoriHistory.set([{ speaker: 'Kitsune', word: first.word, reading: first.pronunciation }]);
    this.shiritoriRequired.set(this.readingTail(first.pronunciation));
    this.shiritoriTurn.set('user');
    this.shiritoriInput.set('');
    this.shiritoriError.set(null);
    this.tts.speakVocabulary(first.word, first.pronunciation);
  }

  private containsKanji(value: string): boolean {
    return /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/u.test(value);
  }

  private normalizeReading(value: string): string {
    return [...value.trim().replace(/[\s・.]/g, '')]
      .map((char) => {
        const code = char.charCodeAt(0);
        return code >= 0x30a1 && code <= 0x30f6 ? String.fromCharCode(code - 0x60) : char;
      })
      .join('');
  }

  private readingTail(value: string): string {
    const reading = this.normalizeReading(value).replace(/ー+$/u, '');
    return [...reading].slice(-2).join('');
  }
}
