import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

import { GrammarPointDto, GrammarService } from '../../../../core/services/grammar.service';
import { LoadingFoxComponent } from '../../../../shared/components/loading-fox/loading-fox.component';

@Component({
  selector: 'app-grammar-search',
  standalone: true,
  imports: [CommonModule, FormsModule, LoadingFoxComponent],
  templateUrl: './grammar-search.component.html',
  styleUrl: './grammar-search.component.css'
})
export class GrammarSearchComponent implements OnInit {
  private readonly grammarService = inject(GrammarService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly searchSubject = new Subject<string>();

  readonly searchQuery = signal<string>('');
  readonly jlptLevel = signal<number | null>(null);
  readonly results = signal<GrammarPointDto[]>([]);
  readonly selected = signal<GrammarPointDto | null>(null);
  readonly isSearching = signal<boolean>(false);
  readonly errorMsg = signal<string | null>(null);

  readonly jlptLevels: readonly number[] = [5, 4, 3, 2, 1];

  ngOnInit(): void {
    this.doSearch();
    this.searchSubject
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.doSearch());
  }

  onSearchInput(value: string): void {
    this.searchQuery.set(value);
    this.searchSubject.next(value);
  }

  onSelectLevel(level: number | null): void {
    this.jlptLevel.set(this.jlptLevel() === level ? null : level);
    this.doSearch();
  }

  private doSearch(): void {
    this.isSearching.set(true);
    this.errorMsg.set(null);
    this.grammarService
      .search(this.searchQuery(), this.jlptLevel())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (rows) => {
          this.results.set(rows);
          this.isSearching.set(false);
          this.selected.set(rows.length ? rows[0] : null);
        },
        error: (err) => {
          this.isSearching.set(false);
          this.results.set([]);
          this.selected.set(null);
          this.errorMsg.set((err as { message?: string })?.message ?? 'Không thể tải ngữ pháp');
        }
      });
  }

  select(item: GrammarPointDto): void {
    this.selected.set(item);
  }

  jlptLabel(level: number | null): string {
    return level === null ? '—' : `N${level}`;
  }

  jlptColor(level: number | null): string {
    const colors: Record<number, string> = { 1: '#dc2626', 2: '#d97706', 3: '#16a34a', 4: '#2563eb', 5: '#7c3aed' };
    return level ? (colors[level] ?? '#6b7280') : '#6b7280';
  }
}
