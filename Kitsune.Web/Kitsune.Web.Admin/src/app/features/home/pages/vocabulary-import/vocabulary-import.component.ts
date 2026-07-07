import { CommonModule } from '@angular/common';
import { Component, OnDestroy, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { AuthService } from '../../../../core/services/auth.service';
import {
  VocabularyImportAdminService,
  VocabularyImportLogEntry,
  VocabularyImportProgressDto,
  VocabularyImportSummaryDto
} from '../../../../core/services/vocabulary-import-admin.service';

@Component({
  selector: 'app-vocabulary-import-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './vocabulary-import.component.html',
  styleUrl: './vocabulary-import.component.css'
})
export class VocabularyImportComponent implements OnDestroy {
  private readonly formBuilder = inject(FormBuilder);
  private readonly vocabularyImportService = inject(VocabularyImportAdminService);
  private readonly authService = inject(AuthService);
  private importAbortController: AbortController | null = null;

  protected readonly importing = signal(false);
  protected readonly message = signal('');
  protected readonly warning = signal('');
  protected readonly user = signal(this.authService.getStoredUser());
  protected readonly importProgress = signal<VocabularyImportProgressDto | null>(null);
  protected readonly importLogs = signal<VocabularyImportLogEntry[]>([]);
  protected readonly latestSummary = signal<VocabularyImportSummaryDto | null>(null);

  protected readonly importForm = this.formBuilder.nonNullable.group({
    sourceDir: ['F:\\NgDuyLinh\\Personal_Project\\Kitsune_Total\\vnjpdict-vocabulary-crawler\\output\\vocabularies'],
    folderName: ['']
  });

  ngOnDestroy(): void {
    this.closeImportStream();
  }

  protected importVocabulary(): void {
    const sourceDir = this.importForm.controls.sourceDir.value.trim();
    const folderName = this.importForm.controls.folderName.value.trim();

    if (!folderName) {
      this.warning.set('Folder dich bat buoc phai nhap, khong de trong.');
      this.message.set('');
      return;
    }

    this.importing.set(true);
    this.message.set('');
    this.warning.set('');
    this.latestSummary.set(null);
    this.importLogs.set([]);
    this.importProgress.set({
      stage: 'starting',
      message: 'Dang khoi tao ket noi import vocabulary...',
      currentFileIndex: 0,
      totalFiles: 0,
      processedRecords: 0,
      totalRecords: 0,
      vocabularyCount: 0,
      kanjiComponentCount: 0,
      updatedCount: 0,
      createdCount: 0,
      skippedCount: 0,
      isCompleted: false,
      isWarning: false,
      isError: false
    });

    this.pushLog({
      stage: 'starting',
      message: `Khoi dong import tu ${sourceDir || 'thu muc mac dinh'} vao folder ${folderName}`,
      tone: 'info'
    });

    this.closeImportStream();
    const abortController = new AbortController();
    this.importAbortController = abortController;

    this.vocabularyImportService
      .importFromDirectoryStreamJson(
        sourceDir || undefined,
        folderName || undefined,
        (streamMessage) => {
          if (streamMessage.type === 'progress') {
            this.handleImportProgress(streamMessage.payload);
            return;
          }

          if (streamMessage.type === 'complete') {
            this.handleImportComplete(streamMessage.payload);
            return;
          }

          this.handleImportError(streamMessage.payload.message);
        },
        abortController.signal
      )
      .catch((error: unknown) => {
        if (abortController.signal.aborted) {
          return;
        }

        const message = error instanceof Error ? error.message : 'Ket noi import vocabulary bi ngat hoac server tra loi.';
        this.handleImportError(message);
      });
  }

  private handleImportProgress(payload: VocabularyImportProgressDto): void {
    this.importProgress.set(payload);
    this.message.set(payload.message);
    this.pushLog({
      stage: payload.stage,
      message: payload.message,
      currentWord: payload.currentWord,
      currentFileName: payload.currentFileName,
      tone: payload.isError ? 'error' : payload.isWarning ? 'warning' : payload.isCompleted ? 'success' : 'info'
    });

    if (payload.isWarning) {
      this.warning.set(payload.message);
    }
  }

  private handleImportComplete(payload: VocabularyImportSummaryDto): void {
    this.importing.set(false);
    this.latestSummary.set(payload);
    this.message.set(
      `Da import ${payload.vocabularyCount} tu vung vao folder ${payload.folderName}. Tao moi ${payload.createdCount}, cap nhat ${payload.updatedCount}.`
    );
    this.importProgress.update((current) =>
      current ? { ...current, isCompleted: true, message: 'Hoan tat import vocabulary.' } : current
    );
    this.pushLog({
      stage: 'complete',
      message: `Hoan tat tu ${payload.sourceDirectory}: ${payload.vocabularyCount} vocabulary, ${payload.kanjiComponentCount} lien ket kanji.`,
      tone: 'success'
    });
    this.importAbortController = null;
  }

  private handleImportError(message: string): void {
    this.importing.set(false);
    this.warning.set(message);
    this.pushLog({
      stage: 'error',
      message,
      tone: 'error'
    });
    this.closeImportStream();
  }

  private pushLog(entry: Omit<VocabularyImportLogEntry, 'id' | 'timestamp'>): void {
    if (!entry.message.trim()) {
      return;
    }

    const logEntry: VocabularyImportLogEntry = {
      ...entry,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour12: false })
    };

    this.importLogs.update((logs) => [logEntry, ...logs].slice(0, 150));
  }

  private closeImportStream(): void {
    this.importAbortController?.abort();
    this.importAbortController = null;
  }
}
