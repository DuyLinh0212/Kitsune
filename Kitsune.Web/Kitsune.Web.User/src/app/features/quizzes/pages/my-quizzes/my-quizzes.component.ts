import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { supabase } from '../../../../core/supabase/supabase.client';
import { LoadingFoxComponent } from '../../../../shared/components/loading-fox/loading-fox.component';

const MODE_LABELS: Record<string, string> = {
  MEAN_FROM_WORD: 'Đoán nghĩa',
  WORD_FROM_MEAN: 'Chọn từ',
  FILL_BLANK: 'Điền khuyết',
  ON_KUN_READ: 'On/Kun',
  HAN_VIET: 'Hán Việt',
  COMPOSE_KANJI: 'Ghép Kanji',
};

export interface MyQuizDto {
  id: number;
  title: string;
  description: string | null;
  parsedModes: string[];
  userDescription: string | null;
  modeName: string;
  timeLimitInSeconds: number;
  isPublic: boolean;
  attemptCount: number;
  createdAt: string;
}

interface ToastMessage {
  text: string;
  type: 'success' | 'error' | 'info';
}

@Component({
  selector: 'app-my-quizzes',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, LoadingFoxComponent],
  templateUrl: './my-quizzes.component.html',
  styleUrls: ['./my-quizzes.component.css'],
})
export class MyQuizzesComponent implements OnInit {
  constructor(private router: Router) {}
  quizzes = signal<MyQuizDto[]>([]);
  searchQuery = signal('');
  isLoading = signal(true);
  toast = signal<ToastMessage | null>(null);
  isTogglingId = signal<number | null>(null);
  isDeleting = signal(false);
  deleteTarget = signal<MyQuizDto | null>(null);

  filteredQuizzes = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    if (!q) return this.quizzes();
    return this.quizzes().filter(
      (quiz) =>
        quiz.title.toLowerCase().includes(q) ||
        (quiz.userDescription ?? '').toLowerCase().includes(q) ||
        quiz.parsedModes.some((m) => m.toLowerCase().includes(q))
    );
  });

  ngOnInit(): void {
    this.loadMyQuizzes();
  }

  private async loadMyQuizzes(): Promise<void> {
    this.isLoading.set(true);
    try {
      const userId = await this.getCurrentUserId();

      const { data, error } = await supabase
        .from('Quizzes')
        .select(
          'Id, Title, Description, TimeLimitInSeconds, IsPublic, CreatedAt, QuizModes:QuizModeId(ModeName), QuizAttempts(count)'
        )
        .eq('CreatorId', userId)
        .order('CreatedAt', { ascending: false });

      if (error) throw error;

      const mapped: MyQuizDto[] = (data ?? []).map((r: Record<string, unknown>) => {
        const modeObj = r['QuizModes'] as Record<string, unknown> | null;
        const attemptsArr = r['QuizAttempts'] as Array<{ count: number }> | null;
        const attemptCount =
          Array.isArray(attemptsArr) && attemptsArr.length > 0
            ? (attemptsArr[0].count ?? 0)
            : 0;

        let parsedModes: string[] = [];
        let userDescription: string | null = null;
        const rawDesc = r['Description'] as string | null;
        if (rawDesc) {
          try {
            const parsed = JSON.parse(rawDesc) as { modes?: string[]; userDescription?: string | null };
            parsedModes = (parsed.modes ?? []).map((m) => MODE_LABELS[m] ?? m);
            userDescription = parsed.userDescription ?? null;
          } catch {
            userDescription = rawDesc;
          }
        }

        return {
          id: r['Id'] as number,
          title: r['Title'] as string,
          description: rawDesc,
          parsedModes,
          userDescription,
          modeName: (modeObj?.['ModeName'] as string) ?? 'Không rõ',
          timeLimitInSeconds: (r['TimeLimitInSeconds'] as number) ?? 0,
          isPublic: (r['IsPublic'] as boolean) ?? false,
          attemptCount,
          createdAt: r['CreatedAt'] as string,
        };
      });

      this.quizzes.set(mapped);
    } catch (err) {
      console.error(err);
      this.showToast('Không thể tải quiz của bạn. Vui lòng thử lại.', 'error');
    } finally {
      this.isLoading.set(false);
    }
  }

  async togglePublic(quiz: MyQuizDto): Promise<void> {
    if (this.isTogglingId() === quiz.id) return;
    this.isTogglingId.set(quiz.id);
    try {
      const newValue = !quiz.isPublic;
      const { error } = await supabase
        .from('Quizzes')
        .update({ IsPublic: newValue })
        .eq('Id', quiz.id);
      if (error) throw error;

      this.quizzes.update((list) =>
        list.map((q) => (q.id === quiz.id ? { ...q, isPublic: newValue } : q))
      );
      this.showToast(
        newValue ? 'Đã đặt quiz thành công khai.' : 'Đã đặt quiz thành riêng tư.',
        'success'
      );
    } catch (err) {
      console.error(err);
      this.showToast('Không thể thay đổi trạng thái. Vui lòng thử lại.', 'error');
    } finally {
      this.isTogglingId.set(null);
    }
  }

  requestDelete(quiz: MyQuizDto): void {
    this.deleteTarget.set(quiz);
  }

  cancelDelete(): void {
    if (this.isDeleting()) return;
    this.deleteTarget.set(null);
  }

  async confirmDelete(): Promise<void> {
    const target = this.deleteTarget();
    if (!target || this.isDeleting()) return;

    this.isDeleting.set(true);
    try {
      // Dissociate posts that reference this quiz
      const { error: postError } = await supabase
        .from('Posts')
        .update({ QuizId: null })
        .eq('QuizId', target.id);

      if (postError) throw postError;

      // Now delete the quiz
      const { error } = await supabase
        .from('Quizzes')
        .delete()
        .eq('Id', target.id);

      if (error) throw error;

      this.quizzes.update((list) => list.filter((q) => q.id !== target.id));
      this.showToast('Đã xóa quiz thành công.', 'success');
    } catch (err) {
      console.error(err);
      this.showToast('Không thể xóa quiz. Vui lòng thử lại.', 'error');
    } finally {
      this.isDeleting.set(false);
      this.deleteTarget.set(null);
    }
  }

  onCreateQuiz(): void {
    this.router.navigate(['/quiz-create']);
  }

  formatTimeLimit(seconds: number): string {
    if (!seconds || seconds <= 0) return 'Không giới hạn';
    const minutes = Math.round(seconds / 60);
    return `${minutes} phút`;
  }

  getModeClass(modeName: string): string {
    const lower = (modeName ?? '').toLowerCase();
    if (lower.includes('trắc nghiệm') || lower.includes('multiple') || lower.includes('mc')) return 'mode-mc';
    if (lower.includes('lật') || lower.includes('flash') || lower.includes('card')) return 'mode-flash';
    if (lower.includes('gõ') || lower.includes('type') || lower.includes('input')) return 'mode-type';
    return 'mode-default';
  }

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
}
