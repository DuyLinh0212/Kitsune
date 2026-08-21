// frontend/Kitsune.Web.User/src/app/features/posts/pages/post-detail/post-detail.component.ts
import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../../../../core/supabase/supabase.client';
import { NotificationService } from '../../../../core/services/notification.service';
import { AuthService } from '../../../../core/services/auth.service';
import { LoadingFoxComponent } from '../../../../shared/components/loading-fox/loading-fox.component';

interface PostDto {
  id: string;
  title: string;
  content: string;
  likesCount: number;
  createdAt: string;
  authorName: string;
  authorUsername: string;
  authorUserId: number | null;
  imageUrl: string | null;
  attachedQuizId: number | null;
  attachedQuizTitle: string | null;
}

interface CommentDto {
  id: number;
  content: string;
  likesCount: number;
  createdAt: string;
  authorName: string;
  authorUsername: string;
  authorUserId: number | null;
  parentCommentId: number | null;
  imageUrl: string | null;
  replies: CommentDto[];
}

@Component({
  selector: 'app-post-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, LoadingFoxComponent],
  templateUrl: './post-detail.component.html',
  styleUrl: './post-detail.component.css',
})
export class PostDetailComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly notificationService = inject(NotificationService);
  private readonly authService = inject(AuthService);

  readonly post = signal<PostDto | null>(null);
  readonly comments = signal<CommentDto[]>([]);
  readonly isLoading = signal(true);
  readonly newComment = signal('');
  readonly replyingToId = signal<number | null>(null);
  readonly replyText = signal('');
  readonly isSubmitting = signal(false);
  readonly toast = signal<{ message: string; type: 'success' | 'error' } | null>(null);
  readonly currentUserId = signal<number | null>(null);
  readonly commentsError = signal(false);

  // Comment image upload
  readonly commentImageUrl = signal<string | null>(null);
  readonly commentImagePreview = signal<string | null>(null);
  readonly isUploadingCommentImage = signal(false);

  // Lightbox
  readonly lightboxUrl = signal<string | null>(null);

  private postId = '';
  private realtimeChannel: RealtimeChannel | null = null;

  ngOnInit(): void {
    this.postId = this.route.snapshot.paramMap.get('id') ?? '';
    if (!this.postId) {
      this.router.navigate(['/posts']);
      return;
    }
    this.initAsync();
  }

  ngOnDestroy(): void {
    if (this.realtimeChannel) {
      supabase.removeChannel(this.realtimeChannel);
    }
  }

  private async initAsync(): Promise<void> {
    await Promise.all([
      this.loadCurrentUser(),
      this.loadPost(),
      this.loadComments(),
    ]);
    this.subscribeToRealtime();
  }

  private async loadCurrentUser(): Promise<void> {
    try {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user?.email) return;
      const { data: profile } = await supabase
        .from('Users')
        .select('Id')
        .eq('Email', authData.user.email)
        .maybeSingle();
      if (profile) {
        this.currentUserId.set((profile as { Id: number }).Id);
      }
    } catch {
      // silently ignore
    }
  }

  private async loadPost(): Promise<void> {
    try {
      const { data, error } = await supabase
        .from('Posts')
        .select('Id, Title, Content, LikesCount, CreatedAt, ImageUrl, QuizId, Users:UserId(Id, Username, FullName), Quizzes:QuizId(Id, Title)')
        .eq('Id', this.postId)
        .single();

      if (error || !data) {
        this.showToast('Không thể tải bài viết', 'error');
        this.isLoading.set(false);
        return;
      }

      const row = data as unknown as {
        Id: string; Title: string; Content: string; LikesCount: number;
        CreatedAt: string; ImageUrl: string | null; QuizId: number | null;
        Users: { Id: number; Username: string; FullName: string | null } | { Id: number; Username: string; FullName: string | null }[] | null;
        Quizzes: { Id: number; Title: string } | Array<{ Id: number; Title: string }> | null;
      };

      const quiz = Array.isArray(row.Quizzes) ? (row.Quizzes[0] ?? null) : row.Quizzes;
      const userObj = Array.isArray(row.Users) ? (row.Users[0] ?? null) : row.Users;

      this.post.set({
        id: row.Id,
        title: row.Title,
        content: row.Content,
        likesCount: row.LikesCount ?? 0,
        createdAt: row.CreatedAt,
        authorName: userObj?.FullName || userObj?.Username || 'Ẩn danh',
        authorUsername: userObj?.Username || 'unknown',
        authorUserId: userObj?.Id ?? null,
        imageUrl: row.ImageUrl ?? null,
        attachedQuizId: row.QuizId ?? null,
        attachedQuizTitle: quiz?.Title ?? null,
      });
    } catch {
      this.showToast('Lỗi kết nối', 'error');
    } finally {
      this.isLoading.set(false);
    }
  }

  private async loadComments(): Promise<void> {
    try {
      const { data, error } = await supabase
        .from('PostComments')
        .select('Id, Content, LikesCount, CreatedAt, ParentCommentId, ImageUrl, Users:UserId(Id, Username, FullName)')
        .eq('PostId', this.postId)
        .is('ParentCommentId', null)
        .order('CreatedAt', { ascending: true });

      if (error) {
        this.commentsError.set(true);
        return;
      }

      const topLevel = this.mapComments(data ?? []);

      if (topLevel.length > 0) {
        const topIds = topLevel.map((c) => c.id);
        const { data: replyData } = await supabase
          .from('PostComments')
          .select('Id, Content, LikesCount, CreatedAt, ParentCommentId, ImageUrl, Users:UserId(Id, Username, FullName)')
          .eq('PostId', this.postId)
          .in('ParentCommentId', topIds)
          .order('CreatedAt', { ascending: true });

        const replies = this.mapComments(replyData ?? []);
        for (const comment of topLevel) {
          comment.replies = replies.filter((r) => r.parentCommentId === comment.id);
        }
      }

      this.comments.set(topLevel);
    } catch {
      this.commentsError.set(true);
    }
  }

  private mapComments(rows: unknown[]): CommentDto[] {
    return (rows as Array<{
      Id: number; Content: string; LikesCount: number;
      CreatedAt: string; ParentCommentId: number | null; ImageUrl: string | null;
      Users: { Id: number; Username: string; FullName: string | null } | null;
    }>).map((row) => ({
      id: row.Id,
      content: row.Content,
      likesCount: row.LikesCount ?? 0,
      createdAt: row.CreatedAt,
      authorName: row.Users?.FullName || row.Users?.Username || 'Ẩn danh',
      authorUsername: row.Users?.Username || 'unknown',
      authorUserId: row.Users?.Id ?? null,
      parentCommentId: row.ParentCommentId ?? null,
      imageUrl: row.ImageUrl ?? null,
      replies: [],
    }));
  }

  private subscribeToRealtime(): void {
    this.realtimeChannel = supabase
      .channel(`post-comments-${this.postId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'PostComments',
          filter: `PostId=eq.${this.postId}`,
        },
        () => {
          void this.loadComments();
        }
      )
      .subscribe();
  }

  async likePost(): Promise<void> {
    const current = this.post();
    if (!current) return;
    const newCount = current.likesCount + 1;
    const { error } = await supabase
      .from('Posts')
      .update({ LikesCount: newCount })
      .eq('Id', this.postId);
    if (!error) {
      this.post.update((p) => (p ? { ...p, likesCount: newCount } : p));
    }
  }

  // ── Comment image upload ───────────────────────────────────────────────────

  async onCommentImageChange(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => this.commentImagePreview.set(e.target?.result as string);
    reader.readAsDataURL(file);

    this.isUploadingCommentImage.set(true);
    try {
      const userId = this.currentUserId();
      if (!userId) throw new Error('Not authenticated');

      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const path = `comments/${userId}/${Date.now()}_${safeName}`;

      // Requires Supabase Storage bucket "post-images" (public) to exist
      const { error: uploadError } = await supabase.storage
        .from('post-images')
        .upload(path, file, { cacheControl: '3600', upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('post-images').getPublicUrl(path);
      this.commentImageUrl.set(data.publicUrl);
    } catch {
      this.showToast('Không thể tải ảnh lên. Hãy kiểm tra bucket "post-images" trong Supabase.', 'error');
      this.commentImagePreview.set(null);
    } finally {
      this.isUploadingCommentImage.set(false);
      input.value = '';
    }
  }

  removeCommentImage(): void {
    this.commentImageUrl.set(null);
    this.commentImagePreview.set(null);
  }

  // ── Comments ───────────────────────────────────────────────────────────────

  async addComment(): Promise<void> {
    const content = this.newComment().trim();
    if (!content) return;
    const userId = this.currentUserId();
    if (!userId) {
      this.showToast('Bạn cần đăng nhập để bình luận', 'error');
      return;
    }
    if (this.isUploadingCommentImage()) {
      this.showToast('Đang tải ảnh lên, vui lòng chờ...', 'error');
      return;
    }
    this.isSubmitting.set(true);
    try {
      const payload: Record<string, unknown> = {
        PostId: this.postId,
        UserId: userId,
        Content: content,
        ParentCommentId: null,
        LikesCount: 0,
      };
      if (this.commentImageUrl()) {
        payload['ImageUrl'] = this.commentImageUrl();
      }
      const { error } = await supabase.from('PostComments').insert(payload);
      if (error) {
        this.showToast('Không thể gửi bình luận: ' + error.message, 'error');
      } else {
        this.newComment.set('');
        this.commentImageUrl.set(null);
        this.commentImagePreview.set(null);
        await this.loadComments();
        // Notify post author
        const post = this.post();
        const commenterName = this.authService.getStoredUser()?.fullName || this.authService.getStoredUser()?.username || 'Bạn';
        if (post?.authorUserId && post.authorUserId !== userId) {
          void this.notificationService.notifyPostAuthor(
            post.authorUserId,
            this.postId,
            userId,
            commenterName
          );
        }
      }
    } catch {
      this.showToast('Lỗi kết nối', 'error');
    } finally {
      this.isSubmitting.set(false);
    }
  }

  async addReply(parentId: number): Promise<void> {
    const content = this.replyText().trim();
    if (!content) return;
    const userId = this.currentUserId();
    if (!userId) {
      this.showToast('Bạn cần đăng nhập để trả lời', 'error');
      return;
    }
    this.isSubmitting.set(true);
    try {
      const { error } = await supabase.from('PostComments').insert({
        PostId: this.postId,
        UserId: userId,
        Content: content,
        ParentCommentId: parentId,
        LikesCount: 0,
      });
      if (error) {
        this.showToast('Không thể gửi trả lời: ' + error.message, 'error');
      } else {
        this.replyText.set('');
        this.replyingToId.set(null);
        await this.loadComments();
        // Notify parent comment author
        const parentComment = this.findCommentById(parentId);
        const replierName = this.authService.getStoredUser()?.fullName || this.authService.getStoredUser()?.username || 'Bạn';
        if (parentComment?.authorUserId && parentComment.authorUserId !== userId) {
          void this.notificationService.notifyCommentReply(
            parentComment.authorUserId,
            this.postId,
            parentId,
            replierName
          );
        }
      }
    } catch {
      this.showToast('Lỗi kết nối', 'error');
    } finally {
      this.isSubmitting.set(false);
    }
  }

  private findCommentById(id: number): CommentDto | null {
    const all = this.comments();
    for (const c of all) {
      if (c.id === id) return c;
      for (const r of c.replies) {
        if (r.id === id) return r;
      }
    }
    return null;
  }

  async likeComment(comment: CommentDto): Promise<void> {
    const newCount = comment.likesCount + 1;
    const { error } = await supabase
      .from('PostComments')
      .update({ LikesCount: newCount })
      .eq('Id', comment.id);
    if (!error) {
      this.comments.update((list) =>
        list.map((c) => {
          if (c.id === comment.id) return { ...c, likesCount: newCount };
          return {
            ...c,
            replies: c.replies.map((r) =>
              r.id === comment.id ? { ...r, likesCount: newCount } : r
            ),
          };
        })
      );
    }
  }

  sharePost(): void {
    navigator.clipboard
      .writeText(window.location.href)
      .then(() => this.showToast('Đã sao chép link!', 'success'))
      .catch(() => this.showToast('Không thể sao chép link', 'error'));
  }

  setReplyingTo(commentId: number): void {
    this.replyingToId.set(this.replyingToId() === commentId ? null : commentId);
    this.replyText.set('');
  }

  goBack(): void {
    this.router.navigate(['/posts']);
  }

  navigateToQuiz(quizId: number): void {
    this.router.navigate(['/quizzes', quizId]);
  }

  openLightbox(url: string): void {
    this.lightboxUrl.set(url);
  }

  closeLightbox(): void {
    this.lightboxUrl.set(null);
  }
  formatDate(dateStr: string): string {
    const d = new Date(dateStr);
    return new Intl.DateTimeFormat('vi-VN', {
      timeZone: 'Asia/Ho_Chi_Minh',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(d);
  }

  getInitials(name: string): string {
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? '?';
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  onNewComment(value: string): void {
    this.newComment.set(value);
  }

  onReplyText(value: string): void {
    this.replyText.set(value);
  }

  private showToast(message: string, type: 'success' | 'error'): void {
    this.toast.set({ message, type });
    setTimeout(() => this.toast.set(null), 3000);
  }
}
