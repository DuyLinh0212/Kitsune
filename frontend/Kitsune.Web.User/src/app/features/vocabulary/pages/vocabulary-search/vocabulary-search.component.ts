import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { VocabularyService, VocabularyDto } from '../../../../core/services/vocabulary.service';
import { FolderService, FolderDto } from '../../../../core/services/folder.service';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-vocabulary-search',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './vocabulary-search.component.html',
  styleUrl: './vocabulary-search.component.css'
})
export class VocabularySearchComponent implements OnInit {
  private readonly vocabularyService = inject(VocabularyService);
  private readonly folderService = inject(FolderService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly searchQuery = signal('');
  readonly searchResults = signal<VocabularyDto[]>([]);
  readonly selectedVocab = signal<VocabularyDto | null>(null);
  readonly folders = signal<FolderDto[]>([]);
  readonly showFolderModal = signal(false);
  readonly newFolderName = signal('');
  readonly isSearching = signal(false);
  readonly isLoadingFolders = signal(false);
  readonly isAddingToFolder = signal(false);
  readonly isBookmarked = signal(false);
  readonly isInSRS = signal(false);

  ngOnInit(): void {
    this.loadFolders();
  }

  onSearch(): void {
    const q = this.searchQuery().trim();
    if (!q) {
      this.searchResults.set([]);
      this.selectedVocab.set(null);
      return;
    }
    this.isSearching.set(true);
    this.vocabularyService.searchGlobal(q, 30).subscribe({
      next: (results) => {
        this.searchResults.set(results);
        if (results.length > 0 && !this.selectedVocab()) {
          this.selectedVocab.set(results[0]);
        }
        this.isSearching.set(false);
      },
      error: () => this.isSearching.set(false),
    });
  }

  selectVocab(vocab: VocabularyDto): void {
    this.selectedVocab.set(vocab);
  }

  loadFolders(): void {
    this.isLoadingFolders.set(true);
    this.folderService.getFolders().subscribe({
      next: (folders) => {
        this.folders.set(folders);
        this.isLoadingFolders.set(false);
      },
      error: () => this.isLoadingFolders.set(false),
    });
  }

  openFolderModal(): void {
    this.showFolderModal.set(true);
    this.newFolderName.set('');
  }

  closeFolderModal(): void {
    this.showFolderModal.set(false);
  }

  createFolder(): void {
    const name = this.newFolderName().trim();
    if (!name) return;
    this.folderService.create({ name }).subscribe({
      next: (folder) => {
        this.folders.update((f) => [folder, ...f]);
        this.newFolderName.set('');
        this.showFolderModal.set(false);
      },
    });
  }

  addToFolder(folderId: number): void {
    const vocab = this.selectedVocab();
    if (!vocab) return;
    this.isAddingToFolder.set(true);
    this.folderService.addVocabulary(folderId, vocab.id).subscribe({
      next: () => this.isAddingToFolder.set(false),
      error: () => this.isAddingToFolder.set(false),
    });
  }

  toggleBookmark(): void {
    const vocab = this.selectedVocab();
    if (!vocab) return;
    this.vocabularyService.toggleBookmark(vocab.id).subscribe({
      next: () => this.isBookmarked.update((v) => !v),
    });
  }

  addToSRS(): void {
    this.isInSRS.set(true);
    setTimeout(() => this.isInSRS.set(false), 1500);
  }

  goToVocabDetail(id: number): void {
    this.router.navigate(['/vocabulary', id]);
  }

  get displayName(): string {
    const u = this.authService.getStoredUser();
    return u?.fullName || u?.username || 'Người dùng';
  }

  getKanjiBreakdown(vocab: VocabularyDto): string {
    return vocab.kanjiComponents.map((k) => `${k.character} (${k.amHanViet})`).join(' + ');
  }
}
