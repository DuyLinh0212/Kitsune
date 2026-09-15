import { Injectable } from '@angular/core';

export interface JsonlExportResult {
  filename: string;
  recordCount: number;
  byteSize: number;
}

export type JsonlPageLoader<T> = (offset: number, limit: number) => Promise<readonly T[]>;

@Injectable({ providedIn: 'root' })
export class JsonlExportService {
  async downloadFromPages<T>(
    filename: string,
    loadPage: JsonlPageLoader<T>,
    pageSize = 500
  ): Promise<JsonlExportResult> {
    if (!Number.isInteger(pageSize) || pageSize <= 0) {
      throw new Error('Kích thước trang JSONL không hợp lệ.');
    }

    const chunks: string[] = [];
    let offset = 0;
    let recordCount = 0;

    while (true) {
      const page = await loadPage(offset, pageSize);
      if (page.length === 0) break;

      const lines = page.map((record) => JSON.stringify(record) ?? 'null');
      chunks.push(`${lines.join('\n')}\n`);
      recordCount += page.length;

      if (page.length < pageSize) break;
      offset += page.length;
    }

    const blob = new Blob(chunks, { type: 'application/jsonl;charset=utf-8' });
    this.triggerDownload(blob, filename);

    return {
      filename,
      recordCount,
      byteSize: blob.size
    };
  }

  createTimestampedFilename(prefix: string): string {
    const timestamp = new Date().toISOString().replace(/[.:]/g, '-');
    return `${prefix}-${timestamp}.jsonl`;
  }

  private triggerDownload(blob: Blob, filename: string): void {
    if (typeof document === 'undefined' || typeof URL.createObjectURL !== 'function') {
      throw new Error('Không thể tải file trong môi trường hiện tại.');
    }

    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = filename;
    anchor.style.display = 'none';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();

    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
  }
}
