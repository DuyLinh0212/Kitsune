import { Injectable } from '@angular/core';
import * as XLSX from 'xlsx';

import { CreateGrammarDto, GrammarExampleInput } from './grammar-admin.service';

export interface GrammarImportRowError {
  row: number;
  message: string;
}

export interface GrammarImportItem {
  dto: CreateGrammarDto;
  startRow: number;
  endRow: number;
}

export interface GrammarImportResult {
  items: GrammarImportItem[];
  errors: GrammarImportRowError[];
  grammarCount: number;
  exampleCount: number;
}

interface ParsedRow {
  row: number;
  title: string;
  meaning: string;
  structure: string | null;
  jlptLevel: number | null;
  explanation: string | null;
  example: GrammarExampleInput | null;
}

@Injectable({ providedIn: 'root' })
export class GrammarImportService {
  async parseWorkbook(file: File): Promise<GrammarImportResult> {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const firstSheet = workbook.SheetNames[0];
    if (!firstSheet) return this.emptyResult([{ row: 0, message: 'Tệp không có sheet nào.' }]);

    const sheet = workbook.Sheets[firstSheet];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
    if (rows.length === 0) return this.emptyResult([{ row: 0, message: 'Sheet không có dòng dữ liệu.' }]);

    const errors: GrammarImportRowError[] = [];
    const parsedRows: ParsedRow[] = [];

    rows.forEach((raw, index) => {
      const row = index + 2;
      const parsed = this.parseRow(raw, row, errors);
      if (parsed) parsedRows.push(parsed);
    });

    const items: GrammarImportItem[] = [];
    for (const current of parsedRows) {
      const previous = items.at(-1);
      if (previous && this.isSameGrammar(previous.dto, current)) {
        previous.endRow = current.row;
        if (current.example) previous.dto.examples.push(current.example);
        continue;
      }

      items.push({
        dto: {
          title: current.title,
          meaning: current.meaning,
          structure: current.structure,
          jlptLevel: current.jlptLevel,
          explanation: current.explanation,
          examples: current.example ? [current.example] : []
        },
        startRow: current.row,
        endRow: current.row
      });
    }

    return {
      items,
      errors,
      grammarCount: items.length,
      exampleCount: items.reduce((total, item) => total + item.dto.examples.length, 0)
    };
  }

  private parseRow(raw: Record<string, unknown>, row: number, errors: GrammarImportRowError[]): ParsedRow | null {
    const errorCount = errors.length;
    const title = this.value(raw, ['Title', 'title', 'Mẫu ngữ pháp', 'GrammarTitle']);
    const meaning = this.value(raw, ['Meaning', 'meaning', 'Nghĩa', 'MeaningVi']);
    const structure = this.value(raw, ['Structure', 'structure', 'Cấu trúc']) || null;
    const jlptRaw = this.value(raw, ['JlptLevel', 'jlptLevel', 'JLPT', 'Cấp độ JLPT']);
    const explanation = this.value(raw, ['Explanation', 'explanation', 'Giải thích']) || null;
    const japaneseText = this.value(raw, ['JapaneseText', 'japaneseText', 'Japanese', 'Câu tiếng Nhật']);
    const reading = this.value(raw, ['Reading', 'reading', 'Cách đọc']) || null;
    const meaningVi = this.value(raw, ['MeaningVi', 'meaningVi', 'ExampleMeaningVi', 'Nghĩa ví dụ']) || null;

    if (![title, meaning, structure ?? '', jlptRaw, explanation ?? '', japaneseText, reading ?? '', meaningVi ?? ''].some(Boolean)) return null;
    if (!title) {
      errors.push({ row, message: 'Thiếu Title (mẫu ngữ pháp).' });
      return null;
    }
    if (!meaning) {
      errors.push({ row, message: 'Thiếu Meaning (nghĩa).' });
      return null;
    }
    if (title.length > 150) errors.push({ row, message: 'Title không được vượt quá 150 ký tự.' });
    if (meaning.length > 500) errors.push({ row, message: 'Meaning không được vượt quá 500 ký tự.' });
    if (structure && structure.length > 255) errors.push({ row, message: 'Structure không được vượt quá 255 ký tự.' });
    if (explanation && explanation.length > 2000) errors.push({ row, message: 'Explanation không được vượt quá 2000 ký tự.' });

    const jlptLevel = this.parseJlpt(jlptRaw);
    if (jlptRaw && jlptLevel === null) errors.push({ row, message: 'JlptLevel phải là N1 đến N5.' });
    if (!japaneseText && (reading || meaningVi)) errors.push({ row, message: 'Ví dụ có cách đọc hoặc nghĩa phải có JapaneseText.' });
    if (japaneseText.length > 255) errors.push({ row, message: 'JapaneseText không được vượt quá 255 ký tự.' });
    if (reading && reading.length > 255) errors.push({ row, message: 'Reading không được vượt quá 255 ký tự.' });
    if (meaningVi && meaningVi.length > 500) errors.push({ row, message: 'MeaningVi không được vượt quá 500 ký tự.' });

    if (errors.length > errorCount) return null;

    return {
      row,
      title,
      meaning,
      structure,
      jlptLevel,
      explanation,
      example: japaneseText ? { japaneseText, reading, meaningVi } : null
    };
  }

  private value(row: Record<string, unknown>, aliases: string[]): string {
    const normalized = new Map<string, unknown>();
    Object.entries(row).forEach(([key, value]) => normalized.set(this.normalizeHeader(key), value));
    for (const alias of aliases) {
      const value = normalized.get(this.normalizeHeader(alias));
      if (value !== undefined && value !== null && String(value).trim()) return String(value).trim();
    }
    return '';
  }

  private normalizeHeader(value: string): string {
    return value.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[\s_-]/g, '').toLowerCase();
  }

  private parseJlpt(value: string): number | null {
    if (!value) return null;
    const match = value.trim().toUpperCase().match(/^N?([1-5])$/);
    return match ? Number(match[1]) : null;
  }

  private isSameGrammar(dto: CreateGrammarDto, row: ParsedRow): boolean {
    return dto.title === row.title && dto.meaning === row.meaning && dto.structure === row.structure && dto.jlptLevel === row.jlptLevel && dto.explanation === row.explanation;
  }

  private emptyResult(errors: GrammarImportRowError[]): GrammarImportResult {
    return { items: [], errors, grammarCount: 0, exampleCount: 0 };
  }
}
