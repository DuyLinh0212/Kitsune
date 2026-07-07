// frontend/Kitsune.Web.User/src/app/features/quizzes/pages/quiz-create/quiz-create.component.ts
import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { supabase } from '../../../../core/supabase/supabase.client';

export interface VocabItem {
  id: number;
  word: string;
  pronunciation: string | null;
  meaning: string;
  folderId: number | null;
}

export interface KanjiItem {
  id: number;
  character: string;
  amHanViet: string;
  meaning: string;
  onyomi: string | null;
  kunyomi: string | null;
}

interface FolderItem {
  id: number;
  name: string;
}

interface QuizMode {
  code: string;
  icon: string;
  name: string;
  description: string;
  type: 'vocab' | 'kanji';
}

interface ToastMessage {
  message: string;
  type: 'success' | 'error' | 'info';
}

const QUIZ_MODES: QuizMode[] = [
  { code: 'MEAN_FROM_WORD', icon: '🎯', name: 'Đoán nghĩa', description: 'Hiển thị từ tiếng Nhật → chọn nghĩa tiếng Việt (4 lựa chọn)', type: 'vocab' },
  { code: 'WORD_FROM_MEAN', icon: '📝', name: 'Chọn từ theo nghĩa', description: 'Hiển thị nghĩa tiếng Việt → chọn từ tiếng Nhật (4 lựa chọn)', type: 'vocab' },
  { code: 'FILL_BLANK', icon: '✏️', name: 'Điền khuyết', description: 'Hiển thị nghĩa tiếng Việt → nhập từ tiếng Nhật (gõ tay)', type: 'vocab' },
  { code: 'ON_KUN_READ', icon: '🔤', name: 'Đoán âm on/kun', description: 'Hiển thị chữ Kanji → chọn âm đọc on-yomi / kun-yomi đúng', type: 'kanji' },
  { code: 'HAN_VIET', icon: '🀄', name: 'Đoán âm Hán Việt', description: 'Hiển thị chữ Kanji → chọn âm Hán Việt đúng (4 lựa chọn)', type: 'kanji' },
  { code: 'COMPOSE_KANJI', icon: '🧩', name: 'Ghép chữ', description: 'Hiển thị âm Hán Việt → chọn chữ Kanji tương ứng (4 lựa chọn)', type: 'kanji' },
];

@Component({
  selector: 'app-quiz-create',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './quiz-create.component.html',
  styleUrls: ['./quiz-create.component.css'],
})
export class QuizCreateComponent implements OnInit {
  readonly step = signal<1 | 2 | 3>(1);

  // Step 1
  readonly title = signal('');
  readonly description = signal('');
  readonly timeLimitSeconds = signal(0);
  readonly isPublic = signal(true);
  readonly isProtected = signal(false);

  // Step 2 — Vocabulary
  readonly sourceTab = signal<'folder' | 'search' | 'kanji-search'>('folder');
  readonly userFolders = signal<FolderItem[]>([]);
  readonly selectedFolderIds = signal<Set<number>>(new Set());
  readonly isFoldersLoading = signal(false);
  readonly searchQuery = signal('');
  readonly searchResults = signal<VocabItem[]>([]);
  readonly isSearching = signal(false);
  readonly selectedVocabIds = signal<Set<number>>(new Set());
  readonly allSelectedVocabs = signal<VocabItem[]>([]);

  // Step 2 — Kanji
  readonly kanjiSearchQuery = signal('');
  readonly kanjiSearchResults = signal<KanjiItem[]>([]);
  readonly isKanjiSearching = signal(false);
  readonly selectedKanjiIds = signal<Set<number>>(new Set());
  readonly allSelectedKanjis = signal<KanjiItem[]>([]);

  // Step 3
  readonly selectedModes = signal<Set<string>>(new Set(['MEAN_FROM_WORD']));

  // UI
  readonly isSaving = signal(false);
  readonly toast = signal<ToastMessage | null>(null);
  readonly quizModes = QUIZ_MODES;
  readonly timeLimitOptions = [
    { label: 'Không giới hạn', value: 0 },
    { label: '5 phút', value: 300 },
    { label: '10 phút', value: 600 },
    { label: '15 phút', value: 900 },
    { label: '30 phút', value: 1800 },
  ];

  readonly totalItemCount = computed(() => this.allSelectedVocabs().length + this.allSelectedKanjis().length);
  readonly selectedFolderIdsArray = computed(() => Array.from(this.selectedFolderIds()));

  readonly vocabModesCount = computed(() => {
    const vocabModes = ['MEAN_FROM_WORD', 'WORD_FROM_MEAN', 'FILL_BLANK'];
    return Array.from(this.selectedModes()).filter(m => vocabModes.includes(m)).length;
  });

  readonly kanjiModesCount = computed(() => {
    const kanjiModes = ['ON_KUN_READ', 'HAN_VIET', 'COMPOSE_KANJI'];
    return Array.from(this.selectedModes()).filter(m => kanjiModes.includes(m)).length;
  });

  readonly modeWarning = computed(() => {
    const hasVocabs = this.allSelectedVocabs().length > 0;
    const hasKanjis = this.allSelectedKanjis().length > 0;
    const noVocabMode = this.vocabModesCount() === 0;
    const noKanjiMode = this.kanjiModesCount() === 0;
    if (hasVocabs && noVocabMode && !hasKanjis) return 'Bạn đã chọn từ vựng nhưng chưa chọn chế độ nào cho từ vựng (3 chế độ đầu).';
    if (hasKanjis && noKanjiMode && !hasVocabs) return 'Bạn đã chọn Kanji nhưng chưa chọn chế độ nào cho Kanji (3 chế độ cuối).';
    return null;
  });

  private searchDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  private kanjiSearchDebounceTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(private router: Router) {}

  ngOnInit(): void {
    this.loadUserFolders();
  }

  // ─── Navigation ────────────────────────────────────────────────────────────

  nextStep(): void {
    if (this.step() === 1) {
      if (!this.title().trim()) {
        this.showToast('Vui lòng nhập tiêu đề quiz.', 'error');
        return;
      }
      this.step.set(2);
    } else if (this.step() === 2) {
      if (this.totalItemCount() === 0) {
        this.showToast('Vui lòng chọn ít nhất một từ vựng hoặc Kanji.', 'error');
        return;
      }
      this.step.set(3);
    }
  }

  prevStep(): void {
    if (this.step() === 2) this.step.set(1);
    else if (this.step() === 3) this.step.set(2);
  }

  // ─── Step 2: Folders ────────────────────────────────────────────────────────

  private async loadUserFolders(): Promise<void> {
    this.isFoldersLoading.set(true);
    try {
      const userId = await this.getCurrentUserId();
      const { data, error } = await supabase
        .from('VocabularyFolder')
        .select('Id, FolderName')
        .eq('UserId', userId)
        .order('FolderName');
      if (error) throw error;
      this.userFolders.set((data ?? []).map((r: Record<string, unknown>) => ({
        id: r['Id'] as number,
        name: r['FolderName'] as string,
      })));
    } catch (err) {
      console.error(err);
      this.showToast('Không thể tải danh sách thư mục.', 'error');
    } finally {
      this.isFoldersLoading.set(false);
    }
  }

  async toggleFolder(folderId: number): Promise<void> {
    const current = new Set(this.selectedFolderIds());
    if (current.has(folderId)) {
      current.delete(folderId);
      this.selectedFolderIds.set(current);
      this.allSelectedVocabs.update(vs => vs.filter(v => v.folderId !== folderId));
      this.selectedVocabIds.update(ids => {
        const next = new Set(ids);
        this.allSelectedVocabs().filter(v => v.folderId === folderId).forEach(v => next.delete(v.id));
        return next;
      });
    } else {
      current.add(folderId);
      this.selectedFolderIds.set(current);
      await this.fetchAndAddFolderVocabs(folderId);
    }
  }

  private async fetchAndAddFolderVocabs(folderId: number): Promise<void> {
    try {
      const { data, error } = await supabase
        .from('Vocabularies')
        .select('Id, Word, Pronunciation, Meaning, FolderId')
        .eq('FolderId', folderId);
      if (error) throw error;
      const newVocabs: VocabItem[] = (data ?? []).map((r: Record<string, unknown>) => ({
        id: r['Id'] as number,
        word: r['Word'] as string,
        pronunciation: (r['Pronunciation'] as string | null) ?? null,
        meaning: r['Meaning'] as string,
        folderId: r['FolderId'] as number,
      }));
      this.allSelectedVocabs.update(existing => {
        const existingIds = new Set(existing.map(v => v.id));
        return [...existing, ...newVocabs.filter(v => !existingIds.has(v.id))];
      });
      this.selectedVocabIds.update(ids => {
        const next = new Set(ids);
        newVocabs.forEach(v => next.add(v.id));
        return next;
      });
    } catch (err) {
      console.error(err);
      this.showToast('Không thể tải từ vựng từ thư mục này.', 'error');
    }
  }

  // ─── Step 2: Vocab Search ────────────────────────────────────────────────────

  onSearchInput(value: string): void {
    this.searchQuery.set(value);
    if (this.searchDebounceTimer) clearTimeout(this.searchDebounceTimer);
    if (!value.trim()) { this.searchResults.set([]); return; }
    this.searchDebounceTimer = setTimeout(() => this.searchVocab(), 400);
  }

  async searchVocab(): Promise<void> {
    const q = this.searchQuery().trim();
    if (!q) { this.searchResults.set([]); return; }
    this.isSearching.set(true);
    try {
      const { data, error } = await supabase
        .from('Vocabularies')
        .select('Id, Word, Pronunciation, Meaning, FolderId')
        .or(`Word.ilike.%${q}%,Meaning.ilike.%${q}%`)
        .limit(30);
      if (error) throw error;
      this.searchResults.set((data ?? []).map((r: Record<string, unknown>) => ({
        id: r['Id'] as number,
        word: r['Word'] as string,
        pronunciation: (r['Pronunciation'] as string | null) ?? null,
        meaning: r['Meaning'] as string,
        folderId: (r['FolderId'] as number | null) ?? null,
      })));
    } catch (err) {
      console.error(err);
      this.showToast('Không thể tìm kiếm từ vựng.', 'error');
    } finally {
      this.isSearching.set(false);
    }
  }

  isVocabSelected(vocabId: number): boolean { return this.selectedVocabIds().has(vocabId); }

  toggleVocab(vocab: VocabItem): void {
    const ids = new Set(this.selectedVocabIds());
    if (ids.has(vocab.id)) {
      ids.delete(vocab.id);
      this.selectedVocabIds.set(ids);
      this.allSelectedVocabs.update(list => list.filter(v => v.id !== vocab.id));
    } else {
      ids.add(vocab.id);
      this.selectedVocabIds.set(ids);
      this.allSelectedVocabs.update(list => list.find(v => v.id === vocab.id) ? list : [...list, vocab]);
    }
  }

  isFolderSelected(folderId: number): boolean { return this.selectedFolderIds().has(folderId); }

  // ─── Step 2: Kanji Search ────────────────────────────────────────────────────

  onKanjiSearchInput(value: string): void {
    this.kanjiSearchQuery.set(value);
    if (this.kanjiSearchDebounceTimer) clearTimeout(this.kanjiSearchDebounceTimer);
    if (!value.trim()) { this.kanjiSearchResults.set([]); return; }
    this.kanjiSearchDebounceTimer = setTimeout(() => this.searchKanji(), 400);
  }

  async searchKanji(): Promise<void> {
    const q = this.kanjiSearchQuery().trim();
    if (!q) { this.kanjiSearchResults.set([]); return; }
    this.isKanjiSearching.set(true);
    try {
      const { data, error } = await supabase
        .from('Kanji')
        .select('Id, Character, AmHanViet, Meaning, Onyomi, Kunyomi')
        .or(`Character.ilike.%${q}%,AmHanViet.ilike.%${q}%,Meaning.ilike.%${q}%`)
        .limit(30);
      if (error) throw error;
      this.kanjiSearchResults.set((data ?? []).map((r: Record<string, unknown>) => ({
        id: r['Id'] as number,
        character: r['Character'] as string,
        amHanViet: (r['AmHanViet'] as string) ?? '',
        meaning: (r['Meaning'] as string) ?? '',
        onyomi: (r['Onyomi'] as string | null) ?? null,
        kunyomi: (r['Kunyomi'] as string | null) ?? null,
      })));
    } catch (err) {
      console.error(err);
      this.showToast('Không thể tìm kiếm Kanji.', 'error');
    } finally {
      this.isKanjiSearching.set(false);
    }
  }

  isKanjiSelected(kanjiId: number): boolean { return this.selectedKanjiIds().has(kanjiId); }

  toggleKanji(kanji: KanjiItem): void {
    const ids = new Set(this.selectedKanjiIds());
    if (ids.has(kanji.id)) {
      ids.delete(kanji.id);
      this.selectedKanjiIds.set(ids);
      this.allSelectedKanjis.update(list => list.filter(k => k.id !== kanji.id));
    } else {
      ids.add(kanji.id);
      this.selectedKanjiIds.set(ids);
      this.allSelectedKanjis.update(list => list.find(k => k.id === kanji.id) ? list : [...list, kanji]);
    }
  }

  // ─── Step 3: Modes ──────────────────────────────────────────────────────────

  isModeSelected(code: string): boolean { return this.selectedModes().has(code); }

  toggleMode(code: string): void {
    this.selectedModes.update(modes => {
      const next = new Set(modes);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  }

  // ─── Save — Dynamic generation (no pre-stored questions) ───────────────────
  // Questions are generated at play time using stored vocabIds + kanjiIds + modes.
  // This allows every playthrough to have fresh mode assignments and randomized options.

  async generateAndSaveQuiz(): Promise<void> {
    if (this.isSaving()) return;

    if (this.selectedModes().size === 0) {
      this.showToast('Vui lòng chọn ít nhất một chế độ quiz.', 'error');
      return;
    }
    if (this.totalItemCount() === 0) {
      this.showToast('Không có từ vựng hoặc Kanji nào được chọn.', 'error');
      return;
    }

    this.isSaving.set(true);
    try {
      const userId = await this.getCurrentUserId();
      const modesArray = Array.from(this.selectedModes());
      const vocabIds = this.allSelectedVocabs().map(v => v.id);
      const kanjiIds = this.allSelectedKanjis().map(k => k.id);

      // Embed sources + modes in Description JSON so quiz-play can generate dynamically
      const metaDescription = JSON.stringify({
        modes: modesArray,
        userDescription: this.description().trim() || null,
        vocabIds,
        kanjiIds,
      });

      const { error: quizError } = await supabase
        .from('Quizzes')
        .insert({
          CreatorId: userId,
          QuizModeId: 1,
          Title: this.title().trim(),
          Description: metaDescription,
          TimeLimitInSeconds: this.timeLimitSeconds(),
          IsPublic: this.isPublic(),
        });

      if (quizError) throw quizError;

      this.showToast('Quiz đã được tạo thành công!', 'success');
      setTimeout(() => this.router.navigate(['/my-quizzes']), 1200);
    } catch (err) {
      console.error(err);
      this.showToast('Không thể tạo quiz. Vui lòng thử lại.', 'error');
    } finally {
      this.isSaving.set(false);
    }
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────

  private async getCurrentUserId(): Promise<number> {
    const { data } = await supabase.auth.getUser();
    const { data: profile } = await supabase
      .from('Users')
      .select('Id')
      .eq('Email', data.user!.email!)
      .maybeSingle();
    return (profile as { Id: number }).Id;
  }

  private showToast(message: string, type: 'success' | 'error' | 'info'): void {
    this.toast.set({ message, type });
    setTimeout(() => this.toast.set(null), 3500);
  }

  getStepClass(s: number): string {
    const current = this.step();
    if (s < current) return 'step-done';
    if (s === current) return 'step-active';
    return 'step-pending';
  }

  formatTimeLimit(value: number): string {
    if (!value) return 'Không giới hạn';
    return `${value / 60} phút`;
  }

  onTimeLimitChange(value: string): void {
    this.timeLimitSeconds.set(Number(value));
  }

  setTab(tab: 'folder' | 'search' | 'kanji-search'): void {
    this.sourceTab.set(tab);
  }
}
