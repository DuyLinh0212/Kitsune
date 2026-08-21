import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { of } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { VocabularyService, VocabularyDto } from '../../../../core/services/vocabulary.service';
import { FolderService, FolderDto } from '../../../../core/services/folder.service';
import { AuthService } from '../../../../core/services/auth.service';
import { TtsService } from '../../../../core/services/tts.service';
import { CommentSectionComponent } from '../../../../shared/components/comment-section/comment-section.component';
import { LoadingFoxComponent } from '../../../../shared/components/loading-fox/loading-fox.component';

@Component({
  selector: 'app-vocabulary-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, CommentSectionComponent, LoadingFoxComponent],
  templateUrl: './vocabulary-detail.component.html',
  styleUrl: './vocabulary-detail.component.css'
})
export class VocabularyDetailComponent implements OnInit {
  readonly route = inject(ActivatedRoute);
  readonly router = inject(Router);
  private readonly vocabularyService = inject(VocabularyService);
  private readonly folderService = inject(FolderService);
  private readonly authService = inject(AuthService);
  readonly ttsService = inject(TtsService);

  readonly vocab = signal<VocabularyDto | null>(null);
  readonly folders = signal<FolderDto[]>([]);
  readonly isLoading = signal(true);
  readonly isLoadingFolders = signal(false);
  readonly showFolderModal = signal(false);
  readonly newFolderName = signal('');
  readonly isBookmarked = signal(false);
  readonly isInSRS = signal(false);

  ngOnInit(): void {
    this.route.paramMap.pipe(
      switchMap((params) => {
        const id = Number(params.get('id'));
        if (!id) return of(null);
        this.isLoading.set(true);
        return this.vocabularyService.getById(id);
      })
    ).subscribe({
      next: (data) => {
        this.vocab.set(data);
        this.isLoading.set(false);
        this.loadFolders();
      },
      error: () => this.isLoading.set(false),
    });
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
    const v = this.vocab();
    if (!v) return;
    this.folderService.addVocabulary(folderId, v.id).subscribe();
  }

  toggleBookmark(): void {
    const v = this.vocab();
    if (!v) return;
    this.vocabularyService.toggleBookmark(v.id).subscribe({
      next: () => this.isBookmarked.update((b) => !b),
    });
  }

  speakWord(): void {
    const v = this.vocab();
    if (!v) return;
    this.ttsService.speak(v.word);
  }

  addToSRS(): void {
    this.isInSRS.set(true);
    setTimeout(() => this.isInSRS.set(false), 2000);
  }

  get displayName(): string {
    const u = this.authService.getStoredUser();
    return u?.fullName || u?.username || 'Người dùng';
  }

  getKanjiBreakdown(): string {
    const v = this.vocab();
    if (!v || v.kanjiComponents.length === 0) return '';
    return v.kanjiComponents.map((k) => `${k.character} (${k.amHanViet})`).join(' + ');
  }
}
