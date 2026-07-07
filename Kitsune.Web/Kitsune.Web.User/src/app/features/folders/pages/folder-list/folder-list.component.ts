import { Component, OnInit, OnDestroy, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { FolderService, FolderDto } from '../../../../core/services/folder.service';

interface ToastMessage {
  text: string;
  type: 'success' | 'error';
}

@Component({
  selector: 'app-folder-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './folder-list.component.html',
  styleUrls: ['./folder-list.component.css'],
})
export class FolderListComponent implements OnInit, OnDestroy {
  private folderService = inject(FolderService);
  private vocabSub?: Subscription;

  folders = signal<FolderDto[]>([]);
  isLoading = signal(true);
  showCreateModal = signal(false);
  newFolderName = signal('');
  newDescription = signal('');
  newIsPublic = signal(false);
  isCreating = signal(false);
  toast = signal<ToastMessage | null>(null);

  showRenameModal = signal(false);
  renameTarget = signal<FolderDto | null>(null);
  renameName = signal('');
  renameDescription = signal('');
  isRenaming = signal(false);

  openMenuId = signal<number | null>(null);

  ngOnInit(): void {
    this.loadFolders();
    this.vocabSub = this.folderService.vocabAdded$.subscribe((folderId) => {
      this.folders.update((list) =>
        list.map((f) => (f.id === folderId ? { ...f, vocabCount: f.vocabCount + 1 } : f))
      );
    });
  }

  ngOnDestroy(): void {
    this.vocabSub?.unsubscribe();
  }

  loadFolders(): void {
    this.isLoading.set(true);
    this.folderService.getFolders().subscribe({
      next: (data) => {
        this.folders.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error(err);
        this.showToast('Không thể tải thư mục. Vui lòng thử lại.', 'error');
        this.isLoading.set(false);
      },
    });
  }

  openCreateModal(): void {
    this.newFolderName.set('');
    this.newDescription.set('');
    this.newIsPublic.set(false);
    this.showCreateModal.set(true);
  }

  closeCreateModal(): void {
    this.showCreateModal.set(false);
  }

  createFolder(): void {
    const name = this.newFolderName().trim();
    if (!name) {
      this.showToast('Vui lòng nhập tên thư mục.', 'error');
      return;
    }
    this.isCreating.set(true);
    this.folderService
      .create({
        name,
        description: this.newDescription().trim() || null,
        isPublic: this.newIsPublic(),
      })
      .subscribe({
        next: (folder) => {
          this.folders.update((list) => [folder, ...list]);
          this.isCreating.set(false);
          this.showCreateModal.set(false);
          this.showToast('Tạo thư mục thành công!', 'success');
        },
        error: (err) => {
          console.error(err);
          this.isCreating.set(false);
          this.showToast('Không thể tạo thư mục. Vui lòng thử lại.', 'error');
        },
      });
  }

  openRenameModal(folder: FolderDto): void {
    this.renameTarget.set(folder);
    this.renameName.set(folder.name);
    this.renameDescription.set(folder.description ?? '');
    this.showRenameModal.set(true);
    this.openMenuId.set(null);
  }

  closeRenameModal(): void {
    this.showRenameModal.set(false);
    this.renameTarget.set(null);
  }

  saveRename(): void {
    const target = this.renameTarget();
    if (!target) return;
    const name = this.renameName().trim();
    if (!name) {
      this.showToast('Tên thư mục không được để trống.', 'error');
      return;
    }
    this.isRenaming.set(true);
    this.folderService
      .update(target.id, {
        name,
        description: this.renameDescription().trim() || null,
      })
      .subscribe({
        next: (updated) => {
          this.folders.update((list) =>
            list.map((f) => (f.id === updated.id ? updated : f))
          );
          this.isRenaming.set(false);
          this.showRenameModal.set(false);
          this.renameTarget.set(null);
          this.showToast('Đổi tên thành công!', 'success');
        },
        error: (err) => {
          console.error(err);
          this.isRenaming.set(false);
          this.showToast('Không thể đổi tên. Vui lòng thử lại.', 'error');
        },
      });
  }

  deleteFolder(id: number): void {
    if (!confirm('Bạn có chắc chắn muốn xóa thư mục này không?')) return;
    this.openMenuId.set(null);
    this.folderService.delete(id).subscribe({
      next: () => {
        this.folders.update((list) => list.filter((f) => f.id !== id));
        this.showToast('Đã xóa thư mục.', 'success');
      },
      error: (err) => {
        console.error(err);
        this.showToast('Không thể xóa thư mục. Vui lòng thử lại.', 'error');
      },
    });
  }

  toggleMenu(id: number): void {
    this.openMenuId.update((current) => (current === id ? null : id));
  }

  closeMenu(): void {
    this.openMenuId.set(null);
  }

  private showToast(text: string, type: 'success' | 'error'): void {
    this.toast.set({ text, type });
    setTimeout(() => this.toast.set(null), 3500);
  }
}
