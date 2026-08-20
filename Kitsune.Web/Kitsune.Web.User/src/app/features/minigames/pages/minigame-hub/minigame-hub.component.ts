// Kitsune.Web/Kitsune.Web.User/src/app/features/minigames/pages/minigame-hub/minigame-hub.component.ts
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, DestroyRef, OnDestroy, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
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

@Component({
  selector: 'app-minigame-hub',
  standalone: true,
  imports: [CommonModule, RouterLink],
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
  readonly currentWord = computed(() => this.vocabulary()[this.currentIndex() % Math.max(1, this.vocabulary().length)] ?? null);
  readonly bubbleOptions = computed(() => this.pickOptions(8));
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
    this.topicService.getGameVocabulary(game.type === 'MEMORY_MATCH' ? 10 : 30)
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
    if (target) this.tts.speak(target.word);
  }

  selectKana(char: string): void {
    this.kanaSelection.update((selection) => [...selection, char]);
  }

  undoKana(): void {
    this.kanaSelection.update((selection) => selection.slice(0, -1));
  }

  submitKana(): void {
    const target = this.currentWord();
    if (!target) return;
    this.resolveAnswer(this.kanaSelection().join('') === target.pronunciation, false);
    this.kanaSelection.set([]);
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
    this.selectedMemoryKeys.set([]);
    if (game.type === 'MEMORY_MATCH') this.buildMemoryCards();
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
}
