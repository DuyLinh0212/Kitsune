import { CommonModule } from '@angular/common';
import { Component, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminQuizService, AdminQuizDto, AdminQuizQuestionDto } from '../../../../core/services/admin-quiz.service';

@Component({
  selector: 'app-quiz-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './quiz-management.component.html',
  styleUrl: './quiz-management.component.css'
})
export class QuizManagementComponent {
  private readonly adminQuizService = inject(AdminQuizService);

  protected readonly allQuizzes = signal<AdminQuizDto[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly errorMessage = signal('');
  protected readonly searchQuery = signal('');

  protected readonly selectedQuiz = signal<AdminQuizDto | null>(null);
  protected readonly questions = signal<AdminQuizQuestionDto[]>([]);
  protected readonly questionsLoading = signal(false);

  protected readonly deleteConfirmId = signal<number | null>(null);

  protected readonly quizzes = computed(() => {
    const q = this.searchQuery().toLowerCase();
    return this.allQuizzes().filter((quiz) =>
      !q || quiz.title.toLowerCase().includes(q) || quiz.creatorName.toLowerCase().includes(q)
    );
  });

  constructor() {
    this.loadQuizzes();
  }

  protected loadQuizzes(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');
    this.adminQuizService.getAllQuizzes().subscribe({
      next: (q) => { this.isLoading.set(false); this.allQuizzes.set(q); },
      error: (e: Error) => { this.isLoading.set(false); this.errorMessage.set(e.message); }
    });
  }

  protected viewQuestions(quiz: AdminQuizDto): void {
    this.selectedQuiz.set(quiz);
    this.questionsLoading.set(true);
    this.adminQuizService.getQuizQuestions(quiz.id).subscribe({
      next: (q) => { this.questionsLoading.set(false); this.questions.set(q); },
      error: () => { this.questionsLoading.set(false); this.questions.set([]); }
    });
  }

  protected closeDetail(): void {
    this.selectedQuiz.set(null);
    this.questions.set([]);
  }

  protected confirmDelete(id: number): void {
    this.deleteConfirmId.set(id);
  }

  protected cancelDelete(): void {
    this.deleteConfirmId.set(null);
  }

  protected executeDelete(): void {
    const id = this.deleteConfirmId();
    if (id == null) return;
    this.adminQuizService.deleteQuiz(id).subscribe({
      next: () => {
        this.deleteConfirmId.set(null);
        this.allQuizzes.update((qs) => qs.filter((q) => q.id !== id));
        if (this.selectedQuiz()?.id === id) this.closeDetail();
      },
      error: () => { this.deleteConfirmId.set(null); }
    });
  }

  protected formatDuration(seconds: number): string {
    if (!seconds) return '∞';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return s > 0 ? `${m}p ${s}s` : `${m} phút`;
  }

  protected formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }
}
