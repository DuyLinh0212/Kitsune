import { Injectable } from '@angular/core';

import { environment } from '../../../environments/environment';

export interface VocabularyImportSummaryDto {
  sourceDirectory: string;
  folderName: string;
  folderId: number;
  languageId: number;
  vocabularyCount: number;
  kanjiComponentCount: number;
  updatedCount: number;
  createdCount: number;
  skippedCount: number;
}

export interface VocabularyImportProgressDto {
  stage: string;
  message: string;
  currentWord?: string | null;
  currentFileName?: string | null;
  currentFileIndex: number;
  totalFiles: number;
  processedRecords: number;
  totalRecords: number;
  vocabularyCount: number;
  kanjiComponentCount: number;
  updatedCount: number;
  createdCount: number;
  skippedCount: number;
  isCompleted: boolean;
  isWarning: boolean;
  isError: boolean;
}

export interface VocabularyImportLogEntry {
  id: string;
  timestamp: string;
  stage: string;
  message: string;
  currentWord?: string | null;
  currentFileName?: string | null;
  tone: 'info' | 'warning' | 'error' | 'success';
}

export type VocabularyImportStreamMessage =
  | { type: 'progress'; payload: VocabularyImportProgressDto }
  | { type: 'complete'; payload: VocabularyImportSummaryDto }
  | { type: 'error'; payload: { message: string } };

type RawVocabularyImportStreamMessage = {
  type?: string;
  payload?: unknown;
  Type?: string;
  Payload?: unknown;
};

@Injectable({ providedIn: 'root' })
export class VocabularyImportAdminService {
  async importFromDirectoryStreamJson(
    sourceDir: string | undefined,
    folderName: string | undefined,
    onMessage: (message: VocabularyImportStreamMessage) => void,
    signal?: AbortSignal
  ): Promise<void> {
    const url = new URL(`${environment.supabase.url}/functions/v1/vocabulary-import-stream`);
    if (sourceDir) url.searchParams.set('sourceDir', sourceDir);
    if (folderName) url.searchParams.set('folderName', folderName);

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${environment.supabase.publishableKey}`,
        'Content-Type': 'application/json'
      },
      signal
    });

    if (!response.ok || !response.body) {
      throw new Error(`Vocabulary import stream failed with HTTP ${response.status}.`);
    }

    const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
    let buffer = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += value;
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        onMessage(this.normalizeStreamMessage(JSON.parse(trimmed) as RawVocabularyImportStreamMessage));
      }
    }

    if (buffer.trim()) {
      onMessage(this.normalizeStreamMessage(JSON.parse(buffer.trim()) as RawVocabularyImportStreamMessage));
    }
  }

  private normalizeStreamMessage(raw: RawVocabularyImportStreamMessage): VocabularyImportStreamMessage {
    const type = raw.type ?? raw.Type;
    const payload = raw.payload ?? raw.Payload;

    if (type === 'progress') {
      return { type, payload: payload as VocabularyImportProgressDto };
    }
    if (type === 'complete') {
      return { type, payload: payload as VocabularyImportSummaryDto };
    }
    if (type === 'error') {
      return { type, payload: payload as { message: string } };
    }

    return {
      type: 'error',
      payload: { message: `Vocabulary import stream tra ve goi tin khong hop le: ${JSON.stringify(raw)}` }
    };
  }
}
