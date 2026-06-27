import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { AdminPostService, AdminPostDto, AdminCommentDto } from '../../../../core/services/admin-post.service';

@Component({
  selector: 'app-post-management',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './post-management.component.html',
  styleUrl: './post-management.component.css'
})
export class PostManagementComponent {
  private readonly adminPostService = inject(AdminPostService);

  protected readonly posts = signal<AdminPostDto[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly errorMessage = signal('');
  protected readonly selectedPostId = signal<number | null>(null);
  protected readonly comments = signal<AdminCommentDto[]>([]);
  protected readonly commentsLoading = signal(false);

  constructor() {
    this.loadPosts();
  }

  protected loadPosts(): void {
    this.isLoading.set(true);
    this.adminPostService.getAllPosts().subscribe({
      next: (p) => { this.isLoading.set(false); this.posts.set(p); },
      error: (e: Error) => { this.isLoading.set(false); this.errorMessage.set(e.message); }
    });
  }

  protected viewComments(postId: number): void {
    this.selectedPostId.set(postId);
    this.commentsLoading.set(true);
    this.adminPostService.getPostComments(postId).subscribe({
      next: (c) => { this.commentsLoading.set(false); this.comments.set(c); },
      error: () => { this.commentsLoading.set(false); }
    });
  }

  protected closeComments(): void {
    this.selectedPostId.set(null);
    this.comments.set([]);
  }

  protected hidePost(postId: number): void {
    this.adminPostService.hidePost(postId).subscribe({
      next: () => {
        this.posts.update((ps) => ps.map((p) => p.id === postId ? { ...p, isHidden: true } : p));
      },
      error: () => {}
    });
  }

  protected unhidePost(postId: number): void {
    this.adminPostService.unhidePost(postId).subscribe({
      next: () => {
        this.posts.update((ps) => ps.map((p) => p.id === postId ? { ...p, isHidden: false } : p));
      },
      error: () => {}
    });
  }

  protected deletePost(postId: number): void {
    if (!confirm('Xóa bài đăng này?')) return;
    this.adminPostService.deletePost(postId).subscribe({
      next: () => { this.posts.update((ps) => ps.filter((p) => p.id !== postId)); },
      error: () => {}
    });
  }

  protected deleteComment(commentId: number): void {
    if (!confirm('Xóa bình luận này?')) return;
    this.adminPostService.deleteComment(commentId).subscribe({
      next: () => {
        this.comments.update((cs) => cs.filter((c) => c.id !== commentId));
      },
      error: () => {}
    });
  }
}
