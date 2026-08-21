import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { of } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { VocabularyService, VocabularyDto } from '../../../../core/services/vocabulary.service';
import { AuthService } from '../../../../core/services/auth.service';
import { TtsService } from '../../../../core/services/tts.service';
import { CommentSectionComponent } from '../../../../shared/components/comment-section/comment-section.component';
import { LoadingFoxComponent } from '../../../../shared/components/loading-fox/loading-fox.component';

@Component({
  selector: 'app-vocabulary-detail',
  standalone: true,
  imports: [CommonModule, CommentSectionComponent, LoadingFoxComponent],
  templateUrl: './vocabulary-detail.component.html',
  styleUrl: './vocabulary-detail.component.css'
})
export class VocabularyDetailComponent implements OnInit {
  readonly route = inject(ActivatedRoute);
  readonly router = inject(Router);
  private readonly vocabularyService = inject(VocabularyService);
  private readonly authService = inject(AuthService);
  readonly ttsService = inject(TtsService);

  readonly vocab = signal<VocabularyDto | null>(null);
  readonly isLoading = signal(true);
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
      },
      error: () => this.isLoading.set(false),
    });
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
