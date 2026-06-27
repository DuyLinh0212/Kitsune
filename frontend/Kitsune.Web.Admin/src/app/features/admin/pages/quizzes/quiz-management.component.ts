import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { AdminQuizService, AdminQuizDto, AdminQuizQuestionDto } from '../../../../core/services/admin-quiz.service';

@Component({
  selector: 'app-quiz-management',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './quiz-management.component.html',
  styleUrl: './quiz-management.component.css'
})
export class QuizManagementComponent {
  private readonly adminQuizService = inject(AdminQuizService);

  protected readonly quizzes = signal<AdminQuizDto[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly errorMessage = signal('');
  protected readonly selectedQuizId = signal<number | null>(null);
  protected readonly questions = signal<AdminQuizQuestionDto[]>([]);
  protected readonly questionsLoading = signal(false);

  constructor() {
    this.loadQuizzes();
  }

  protected loadQuizzes(): void {
    this.isLoading.set(true);
    this.adminQuizService.getAllQuizzes().subscribe({
      next: (q) => { this.isLoading.set(false); this.quizzes.set(q); },
      error: (e: Error) => { this.isLoading.set(false); this.errorMessage.set(e.message); }
    });
  }

  protected viewQuestions(quizId: number): void {
    this.selectedQuizId.set(quizId);
    this.questionsLoading.set(true);
    this.adminQuizService.getQuizQuestions(quizId).subscribe({
      next: (q) => { this.questionsLoading.set(false); this.questions.set(q); },
      error: () => { this.questionsLoading.set(false); }
    });
  }

  protected closeQuestions(): void {
    this.selectedQuizId.set(null);
    this.questions.set([]);
  }

  protected togglePublic(quiz: AdminQuizDto): void {
    this.adminQuizService.togglePublic(quiz.id, !quiz.isPublic).subscribe({
      next: () => { quiz.isPublic = !quiz.isPublic; },
      error: () => {}
    });
  }

  protected deleteQuiz(id: number): void {
    if (!confirm('Xóa quiz này?')) return;
    this.adminQuizService.deleteQuiz(id).subscribe({
      next: () => { this.quizzes.update((qs) => qs.filter((q) => q.id !== id)); },
      error: () => {}
    });
  }
}
