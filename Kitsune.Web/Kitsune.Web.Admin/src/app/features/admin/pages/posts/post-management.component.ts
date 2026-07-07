import { CommonModule } from '@angular/common';
import { Component, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminPostService, AdminPostDto, AdminCommentDto } from '../../../../core/services/admin-post.service';

@Component({
  selector: 'app-post-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './post-management.component.html',
  styleUrl: './post-management.component.css'
})
export class PostManagementComponent {
  private readonly adminPostService = inject(AdminPostService);

  protected readonly allPosts = signal<AdminPostDto[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly errorMessage = signal('');
  
  protected readonly searchQuery = signal('');
  protected readonly statusFilter = signal<'ALL' | 'visible' | 'hidden'>('ALL');

  protected readonly selectedPost = signal<AdminPostDto | null>(null);
  protected readonly comments = signal<AdminCommentDto[]>([]);
  protected readonly commentsLoading = signal(false);

  protected readonly deleteConfirmId = signal<number | null>(null);
  protected readonly commentDeleteConfirmId = signal<number | null>(null);

  protected readonly posts = computed(() => {
    const q = this.searchQuery().toLowerCase();
    const status = this.statusFilter();
    return this.allPosts().filter((p) => {
      const matchSearch = !q || p.title.toLowerCase().includes(q) || p.userName.toLowerCase().includes(q);
      const matchStatus = status === 'ALL' || (status === 'hidden' ? p.isHidden : !p.isHidden);
      return matchSearch && matchStatus;
    });
  });

  constructor() {
    this.loadPosts();
  }

  protected loadPosts(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');
    this.adminPostService.getAllPosts().subscribe({
      next: (p) => { this.isLoading.set(false); this.allPosts.set(p); },
      error: (e: Error) => { this.isLoading.set(false); this.errorMessage.set(e.message); }
    });
  }

  protected viewComments(post: AdminPostDto): void {
    this.selectedPost.set(post);
    this.commentsLoading.set(true);
    this.adminPostService.getPostComments(post.id).subscribe({
      next: (c) => { this.commentsLoading.set(false); this.comments.set(c); },
      error: () => { this.commentsLoading.set(false); this.comments.set([]); }
    });
  }

  protected closeComments(): void {
    this.selectedPost.set(null);
    this.comments.set([]);
    this.commentDeleteConfirmId.set(null);
  }

  protected toggleHidden(post: AdminPostDto): void {
    const action = post.isHidden 
      ? this.adminPostService.unhidePost(post.id) 
      : this.adminPostService.hidePost(post.id);
      
    action.subscribe({
      next: () => {
        this.allPosts.update((ps) => ps.map((p) => p.id === post.id ? { ...p, isHidden: !p.isHidden } : p));
      },
      error: () => {}
    });
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
    this.adminPostService.deletePost(id).subscribe({
      next: () => { 
        this.deleteConfirmId.set(null);
        this.allPosts.update((ps) => ps.filter((p) => p.id !== id)); 
      },
      error: () => { this.deleteConfirmId.set(null); }
    });
  }

  protected confirmDeleteComment(id: number): void {
    this.commentDeleteConfirmId.set(id);
  }

  protected cancelDeleteComment(): void {
    this.commentDeleteConfirmId.set(null);
  }

  protected executeDeleteComment(): void {
    const id = this.commentDeleteConfirmId();
    if (id == null) return;
    this.adminPostService.deleteComment(id).subscribe({
      next: () => {
        this.commentDeleteConfirmId.set(null);
        this.comments.update((cs) => cs.filter((c) => c.id !== id));
        // Update comments count on post
        const post = this.selectedPost();
        if (post) {
          this.allPosts.update(ps => ps.map(p => p.id === post.id ? { ...p, commentsCount: p.commentsCount - 1 } : p));
        }
      },
      error: () => { this.commentDeleteConfirmId.set(null); }
    });
  }
}
