// frontend/Kitsune.Web.User/src/app/features/posts/pages/post-list/post-list.component.ts
import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { from } from 'rxjs';
import { supabase } from '../../../../core/supabase/supabase.client';
import { LoadingFoxComponent } from '../../../../shared/components/loading-fox/loading-fox.component';

interface PostDto {
  id: string;
  title: string;
  content: string;
  likesCount: number;
  createdAt: string;
  authorName: string;
  authorUsername: string;
  imageUrl: string | null;
  attachedQuizId: number | null;
  attachedQuizTitle: string | null;
}

interface QuizPickerItem {
  id: number;
  title: string;
}

@Component({
  selector: 'app-post-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, LoadingFoxComponent],
  templateUrl: './post-list.component.html',
  styleUrl: './post-list.component.css',
})
export class PostListComponent implements OnInit {
  protected readonly router = inject(Router);

  readonly posts = signal<PostDto[]>([]);
  readonly isLoading = signal(true);
  readonly showCreateModal = signal(false);
  readonly newTitle = signal('');
  readonly newContent = signal('');
  readonly selectedQuizId = signal<number | null>(null);
  readonly userQuizzes = signal<QuizPickerItem[]>([]);
  readonly isLoadingQuizzes = signal(false);
  readonly isCreating = signal(false);
  readonly toast = signal<{ message: string; type: 'success' | 'error' } | null>(null);

  // Image upload
  readonly uploadedImageUrl = signal<string | null>(null);
  readonly isUploadingImage = signal(false);
  readonly imagePreviewUrl = signal<string | null>(null);

  // Lightbox
  readonly lightboxUrl = signal<string | null>(null);

  private async getCurrentUserIdAsync(): Promise<number | null> {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user?.email) return null;
    const { data: profile } = await supabase
      .from('Users')
      .select('Id')
      .eq('Email', data.user.email)
      .maybeSingle();
    return profile ? (profile as { Id: number }).Id : null;
  }

  private getInitials(name: string): string {
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? '?';
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  getAuthorInitials(post: PostDto): string {
    return this.getInitials(post.authorName || 'U');
  }

  formatDate(dateStr: string): string {
    const d = new Date(dateStr);
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  ngOnInit(): void {
    this.loadPosts();
  }

  loadPosts(): void {
    this.isLoading.set(true);
    from(
      supabase
        .from('Posts')
        .select('Id, Title, Content, LikesCount, CreatedAt, ImageUrl, QuizId, Users:UserId(Username, FullName), Quizzes:QuizId(Id, Title)')
        .order('CreatedAt', { ascending: false })
        .limit(30)
    ).subscribe({
      next: ({ data, error }) => {
        if (error) {
          this.showToast('Không thể tải bài viết', 'error');
        } else {
          const mapped: PostDto[] = ((data ?? []) as unknown as Array<{
            Id: string;
            Title: string;
            Content: string;
            LikesCount: number;
            CreatedAt: string;
            ImageUrl: string | null;
            QuizId: number | null;
            Users: { Username: string; FullName: string | null } | null;
            Quizzes: { Id: number; Title: string } | Array<{ Id: number; Title: string }> | null;
          }>).map((row) => {
            const quiz = Array.isArray(row.Quizzes) ? (row.Quizzes[0] ?? null) : row.Quizzes;
            return {
              id: row.Id,
              title: row.Title,
              content: row.Content,
              likesCount: row.LikesCount ?? 0,
              createdAt: row.CreatedAt,
              authorName: row.Users?.FullName || row.Users?.Username || 'Ẩn danh',
              authorUsername: row.Users?.Username || 'unknown',
              imageUrl: row.ImageUrl ?? null,
              attachedQuizId: row.QuizId ?? null,
              attachedQuizTitle: quiz?.Title ?? null,
            };
          });
          this.posts.set(mapped);
        }
        this.isLoading.set(false);
      },
      error: () => {
        this.showToast('Lỗi kết nối', 'error');
        this.isLoading.set(false);
      },
    });
  }

  openCreateModal(): void {
    this.newTitle.set('');
    this.newContent.set('');
    this.selectedQuizId.set(null);
    this.uploadedImageUrl.set(null);
    this.imagePreviewUrl.set(null);
    this.showCreateModal.set(true);
    this.loadMyQuizzes();
  }

  private async loadMyQuizzes(): Promise<void> {
    this.isLoadingQuizzes.set(true);
    const userId = await this.getCurrentUserIdAsync();
    if (!userId) {
      this.isLoadingQuizzes.set(false);
      return;
    }
    const { data } = await supabase
      .from('Quizzes')
      .select('Id, Title')
      .eq('CreatorId', userId)
      .order('Id', { ascending: false })
      .limit(50);
    this.userQuizzes.set(
      ((data ?? []) as { Id: number; Title: string }[]).map((r) => ({ id: r.Id, title: r.Title }))
    );
    this.isLoadingQuizzes.set(false);
  }

  closeCreateModal(): void {
    this.showCreateModal.set(false);
  }

  onNewTitle(value: string): void {
    this.newTitle.set(value);
  }

  onNewContent(value: string): void {
    this.newContent.set(value);
  }

  selectQuiz(quizId: number): void {
    this.selectedQuizId.set(this.selectedQuizId() === quizId ? null : quizId);
  }

  // ── Lightbox ───────────────────────────────────────────────────────────────

  openLightbox(url: string): void {
    this.lightboxUrl.set(url);
  }

  closeLightbox(): void {
    this.lightboxUrl.set(null);
  }

  // ── Navigate to quiz ───────────────────────────────────────────────────────

  goToQuiz(quizId: number, event: Event): void {
    event.stopPropagation();
    this.router.navigate(['/quizzes', quizId]);
  }

  // ── Image Upload ───────────────────────────────────────────────────────────

  async onImageFileChange(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => this.imagePreviewUrl.set(e.target?.result as string);
    reader.readAsDataURL(file);

    this.isUploadingImage.set(true);
    try {
      const userId = await this.getCurrentUserIdAsync();
      if (!userId) throw new Error('Not authenticated');

      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const path = `posts/${userId}/${Date.now()}_${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from('post-images')
        .upload(path, file, { cacheControl: '3600', upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('post-images').getPublicUrl(path);
      this.uploadedImageUrl.set(data.publicUrl);
    } catch {
      this.showToast('Không thể tải ảnh lên. Hãy kiểm tra bucket "post-images" trong Supabase.', 'error');
      this.imagePreviewUrl.set(null);
    } finally {
      this.isUploadingImage.set(false);
      input.value = '';
    }
  }

  removeUploadedImage(): void {
    this.uploadedImageUrl.set(null);
    this.imagePreviewUrl.set(null);
  }

  // ── Submit Post ────────────────────────────────────────────────────────────

  async submitPost(): Promise<void> {
    const title = this.newTitle().trim();
    const content = this.newContent().trim();
    if (!title || !content) {
      this.showToast('Vui lòng nhập tiêu đề và nội dung', 'error');
      return;
    }
    if (this.isUploadingImage()) {
      this.showToast('Đang tải ảnh lên, vui lòng chờ...', 'error');
      return;
    }
    this.isCreating.set(true);
    try {
      const userId = await this.getCurrentUserIdAsync();
      if (!userId) {
        this.showToast('Bạn cần đăng nhập để đăng bài', 'error');
        return;
      }
      const payload: Record<string, unknown> = {
        Title: title,
        Content: content,
        UserId: userId,
        LikesCount: 0,
      };
      if (this.selectedQuizId() != null) {
        payload['QuizId'] = this.selectedQuizId();
      }
      if (this.uploadedImageUrl() != null) {
        payload['ImageUrl'] = this.uploadedImageUrl();
      }
      const { error } = await supabase.from('Posts').insert(payload);
      if (error) {
        this.showToast('Không thể đăng bài: ' + error.message, 'error');
      } else {
        this.showToast('Đăng bài thành công!', 'success');
        this.closeCreateModal();
        this.loadPosts();
      }
    } catch {
      this.showToast('Lỗi kết nối', 'error');
    } finally {
      this.isCreating.set(false);
    }
  }

  likePost(post: PostDto): void {
    const newCount = post.likesCount + 1;
    from(
      supabase.from('Posts').update({ LikesCount: newCount }).eq('Id', post.id)
    ).subscribe({
      next: ({ error }) => {
        if (!error) {
          this.posts.update((list) =>
            list.map((p) => (p.id === post.id ? { ...p, likesCount: newCount } : p))
          );
        }
      },
    });
  }

  private showToast(message: string, type: 'success' | 'error'): void {
    this.toast.set({ message, type });
    setTimeout(() => this.toast.set(null), 3000);
  }
}
