// frontend/Kitsune.Web.User/src/app/features/quizzes/pages/quiz-list/quiz-list.component.ts
import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { supabase } from '../../../../core/supabase/supabase.client';
import { LoadingFoxComponent } from '../../../../shared/components/loading-fox/loading-fox.component';

export interface QuizDto {
  id: number;
  title: string;
  description: string | null;
  modeName: string;
  timeLimitInSeconds: number;
  createdAt: string;
  creatorName: string | null;
}

interface ToastMessage {
  text: string;
  type: 'success' | 'error';
}

@Component({
  selector: 'app-quiz-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, LoadingFoxComponent],
  templateUrl: './quiz-list.component.html',
  styleUrls: ['./quiz-list.component.css'],
})
export class QuizListComponent implements OnInit {
  quizzes = signal<QuizDto[]>([]);
  searchQuery = signal('');
  isLoading = signal(true);
  toast = signal<ToastMessage | null>(null);

  filteredQuizzes = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    if (!q) return this.quizzes();
    return this.quizzes().filter(
      (quiz) =>
        quiz.title.toLowerCase().includes(q) ||
        (quiz.description ?? '').toLowerCase().includes(q) ||
        quiz.modeName.toLowerCase().includes(q) ||
        (quiz.creatorName ?? '').toLowerCase().includes(q)
    );
  });

  ngOnInit(): void {
    this.loadQuizzes();
  }

  private async loadQuizzes(): Promise<void> {
    this.isLoading.set(true);
    try {
      const { data, error } = await supabase
        .from('Quizzes')
        .select(
          'Id, Title, Description, TimeLimitInSeconds, CreatedAt, QuizModes:QuizModeId(ModeName), Users:CreatorId(Username, FullName)'
        )
        .eq('IsPublic', true)
        .order('CreatedAt', { ascending: false })
        .limit(50);

      if (error) throw error;

      const mapped: QuizDto[] = (data ?? []).map((r: Record<string, unknown>) => {
        const modeObj = r['QuizModes'] as Record<string, unknown> | null;
        const usersRaw = r['Users'];
        const users = Array.isArray(usersRaw) ? (usersRaw[0] ?? null) : usersRaw;
        const u = users as { Username?: string; FullName?: string | null } | null;
        const creatorName = u?.FullName || u?.Username || null;
        return {
          id: r['Id'] as number,
          title: r['Title'] as string,
          description: this.parseUserDescription(r['Description'] as string | null),
          modeName: (modeObj?.['ModeName'] as string) ?? 'Không rõ',
          timeLimitInSeconds: (r['TimeLimitInSeconds'] as number) ?? 0,
          createdAt: r['CreatedAt'] as string,
          creatorName,
        };
      });

      this.quizzes.set(mapped);
    } catch (err) {
      console.error(err);
      this.showToast('Không thể tải danh sách quiz. Vui lòng thử lại.', 'error');
    } finally {
      this.isLoading.set(false);
    }
  }

  private parseUserDescription(raw: string | null): string | null {
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as { userDescription?: string | null };
      return parsed.userDescription?.trim() || null;
    } catch {
      return raw;
    }
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

  private showToast(text: string, type: 'success' | 'error'): void {
    this.toast.set({ text, type });
    setTimeout(() => this.toast.set(null), 3500);
  }
}
