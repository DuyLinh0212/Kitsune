import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnChanges, OnInit, SimpleChanges, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommentDto, CommentService } from '../../../core/services/comment.service';
import { LoadingFoxComponent } from '../loading-fox/loading-fox.component';

@Component({
  selector: 'app-comment-section',
  standalone: true,
  imports: [CommonModule, FormsModule, LoadingFoxComponent],
  templateUrl: './comment-section.component.html',
  styleUrl: './comment-section.component.css',
})
export class CommentSectionComponent implements OnInit, OnChanges {
  readonly vocabularyId = input<number | null>(null);
  readonly kanjiId = input<number | null>(null);

  private readonly commentService = inject(CommentService);
  private readonly destroyRef = inject(DestroyRef);

  readonly comments = signal<CommentDto[]>([]);
  readonly newContent = signal('');
  readonly isLoading = signal(false);
  readonly isSubmitting = signal(false);
  readonly errorText = signal<string | null>(null);

  ngOnInit(): void {
    this.loadComments();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['vocabularyId'] || changes['kanjiId']) {
      this.loadComments();
    }
  }

  loadComments(): void {
    const target = this.currentTarget();
    if (!target) return;

    this.isLoading.set(true);
    this.errorText.set(null);
    this.commentService
      .getComments(target)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (comments) => {
          this.comments.set(comments);
          this.isLoading.set(false);
        },
        error: () => {
          this.errorText.set('Không thể tải ý kiến đóng góp.');
          this.isLoading.set(false);
        },
      });
  }

  submitComment(): void {
    const content = this.newContent().trim();
    const target = this.currentTarget();
    if (!content || !target || this.isSubmitting()) return;

    this.isSubmitting.set(true);
    this.commentService
      .addComment(content, target)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (comment) => {
          this.comments.update((list) => [comment, ...list]);
          this.newContent.set('');
          this.isSubmitting.set(false);
        },
        error: () => {
          this.errorText.set('Không thể gửi ý kiến đóng góp.');
          this.isSubmitting.set(false);
        },
      });
  }

  deleteComment(id: number): void {
    this.commentService
      .deleteComment(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.comments.update((list) => list.filter((c) => c.id !== id)),
        error: () => this.errorText.set('Không thể xóa ý kiến này.'),
      });
  }

  private currentTarget(): { vocabularyId?: number; kanjiId?: number } | null {
    const vocabId = this.vocabularyId();
    const kanjiId = this.kanjiId();
    if (vocabId) return { vocabularyId: vocabId };
    if (kanjiId) return { kanjiId };
    return null;
  }
}
