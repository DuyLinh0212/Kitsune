import { CommonModule } from '@angular/common';
import { Component, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { from } from 'rxjs';
import { map } from 'rxjs/operators';
import { supabase } from '../../../../core/supabase/supabase.client';

interface LogEntry {
  id: number;
  username: string;
  action: string;
  description: string;
  createdAt: string;
  type: 'quiz' | 'srs';
}

@Component({
  selector: 'app-system-logs',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './system-logs.component.html',
  styleUrl: './system-logs.component.css'
})
export class SystemLogsComponent {
  protected readonly allLogs = signal<LogEntry[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly errorMessage = signal('');
  protected readonly searchQuery = signal('');
  protected readonly typeFilter = signal<'ALL' | 'quiz' | 'srs'>('ALL');

  protected readonly logs = computed(() => {
    const q = this.searchQuery().toLowerCase();
    const type = this.typeFilter();
    return this.allLogs().filter((l) => {
      const matchSearch = !q || l.username.toLowerCase().includes(q) || l.description.toLowerCase().includes(q);
      const matchType = type === 'ALL' || l.type === type;
      return matchSearch && matchType;
    });
  });

  constructor() {
    this.loadLogs();
  }

  protected loadLogs(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    // Fetch QuizAttempts + SRSReviewLogs as proxy activity logs
    from(Promise.all([
      supabase
        .from('QuizAttempts')
        .select('Id, CreatedAt, AccuracyPercentage, Quizzes:QuizId(Title), Users:UserId(Username)')
        .order('CreatedAt', { ascending: false })
        .limit(100),
      supabase
        .from('SRSReviewLogs')
        .select('Id, ReviewedAt, Rating, NewBoxLevel, SRSCards:CardId(Users:UserId(Username))')
        .order('ReviewedAt', { ascending: false })
        .limit(100)
    ])).pipe(
      map(([quizRes, srsRes]) => {
        const entries: LogEntry[] = [];
        let idCounter = 0;

        for (const r of quizRes.data ?? []) {
          const user = r['Users'] as unknown as { Username: string } | null;
          const quiz = r['Quizzes'] as unknown as { Title: string } | null;
          const acc = Math.round((r['AccuracyPercentage'] as number) ?? 0);
          entries.push({
            id: ++idCounter,
            username: user?.Username ?? 'Ẩn danh',
            action: 'QUIZ_ATTEMPT',
            description: `Làm quiz "${quiz?.Title ?? '?'}" — ${acc}% chính xác`,
            createdAt: r['CreatedAt'] as string,
            type: 'quiz'
          });
        }

        const RATING_LABELS: Record<number, string> = { 1: 'Quên', 2: 'Khó', 3: 'Tốt', 4: 'Dễ' };
        for (const r of srsRes.data ?? []) {
          const card = r['SRSCards'] as unknown as { Users: { Username: string } | null } | null;
          const username = card?.Users?.Username ?? 'Ẩn danh';
          const rating = (r['Rating'] as number) ?? 0;
          const box = (r['NewBoxLevel'] as number) ?? 0;
          entries.push({
            id: ++idCounter,
            username,
            action: 'SRS_REVIEW',
            description: `Ôn tập — ${RATING_LABELS[rating] ?? '?'} (Box ${box})`,
            createdAt: r['ReviewedAt'] as string,
            type: 'srs'
          });
        }

        // Sort by date descending
        return entries.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      })
    ).subscribe({
      next: (logs) => { this.isLoading.set(false); this.allLogs.set(logs); },
      error: (e: Error) => { this.isLoading.set(false); this.errorMessage.set(e.message); }
    });
  }

  protected actionLabel(action: string): string {
    const map: Record<string, string> = {
      QUIZ_ATTEMPT: 'Quiz',
      SRS_REVIEW: 'SRS'
    };
    return map[action] ?? action;
  }

  protected actionClass(action: string): string {
    return action === 'QUIZ_ATTEMPT' ? 'badge-quiz' : 'badge-srs';
  }

  protected formatDate(iso: string): string {
    return new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    }).format(new Date(iso));
  }
}
