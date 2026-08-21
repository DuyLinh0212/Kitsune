// Kitsune.Web/Kitsune.Web.Admin/src/app/core/services/exam-import.service.ts
import { Injectable } from '@angular/core';
import * as XLSX from 'xlsx';

import {
  CreateExamInput,
  EXAM_QUESTION_TYPES,
  ExamQuestionInput,
  ExamQuestionType
} from './exam-admin.service';

export interface ImportRowError {
  row: number;
  message: string;
}

export interface ImportResult {
  exam: CreateExamInput | null;
  errors: ImportRowError[];
  questionCount: number;
}

const VALID_TYPES = new Set<string>(EXAM_QUESTION_TYPES);

// Cấu trúc JSON mẫu người dùng tải về.
interface JsonQuestion {
  type?: string;
  questionText?: string;
  passageText?: string;
  options?: unknown;
  correctAnswer?: string;
  explanation?: string;
}
interface JsonExam {
  title?: string;
  description?: string;
  jlptLevel?: number | string | null;
  timeLimitInSeconds?: number | string | null;
  questions?: JsonQuestion[];
}

@Injectable({ providedIn: 'root' })
export class ExamImportService {
  // ── JSON ──────────────────────────────────────────────────────────────
  parseJson(text: string): ImportResult {
    let parsed: JsonExam;
    try {
      parsed = JSON.parse(text) as JsonExam;
    } catch {
      return { exam: null, errors: [{ row: 0, message: 'File JSON không hợp lệ (sai cú pháp).' }], questionCount: 0 };
    }

    const errors: ImportRowError[] = [];
    const title = (parsed.title ?? '').trim();
    if (!title) errors.push({ row: 0, message: 'Thiếu "title" (tên đề).' });

    const rawQuestions = Array.isArray(parsed.questions) ? parsed.questions : [];
    if (rawQuestions.length === 0) errors.push({ row: 0, message: 'Đề chưa có câu hỏi nào trong "questions".' });

    const questions: ExamQuestionInput[] = [];
    rawQuestions.forEach((q, i) => {
      const rowNo = i + 1;
      const type = (q.type ?? '').trim().toUpperCase();
      if (!VALID_TYPES.has(type)) {
        errors.push({ row: rowNo, message: `Dạng câu hỏi "${q.type ?? ''}" không hợp lệ.` });
        return;
      }
      const options = Array.isArray(q.options) ? q.options.map((o) => String(o).trim()).filter(Boolean) : [];
      const correct = (q.correctAnswer ?? '').trim();
      const rowErr = this.validateQuestion(type as ExamQuestionType, options, correct, rowNo);
      if (rowErr) {
        errors.push(rowErr);
        return;
      }
      questions.push({
        questionType: type as ExamQuestionType,
        questionText: (q.questionText ?? '').trim() || null,
        passageText: (q.passageText ?? '').trim() || null,
        options,
        correctAnswer: correct,
        explanation: (q.explanation ?? '').trim() || null
      });
    });

    const exam: CreateExamInput | null =
      title && questions.length > 0
        ? {
            title,
            description: (parsed.description ?? '').trim() || null,
            jlptLevel: this.toNullableInt(parsed.jlptLevel),
            timeLimitInSeconds: this.toNullableInt(parsed.timeLimitInSeconds),
            isPublic: false,
            questions
          }
        : null;

    return { exam, errors, questionCount: questions.length };
  }

  // ── Excel / CSV (SheetJS) ─────────────────────────────────────────────
  // Cột: Type | QuestionText | PassageText | OptionA | OptionB | OptionC | OptionD | CorrectAnswer | Explanation
  async parseWorkbook(file: File, title: string, jlptLevel: number | null, timeLimitInSeconds: number | null): Promise<ImportResult> {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const firstSheet = workbook.SheetNames[0];
    if (!firstSheet) {
      return { exam: null, errors: [{ row: 0, message: 'File không có sheet nào.' }], questionCount: 0 };
    }
    const sheet = workbook.Sheets[firstSheet];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });

    const errors: ImportRowError[] = [];
    const questions: ExamQuestionInput[] = [];

    if (rows.length === 0) errors.push({ row: 0, message: 'Sheet không có dòng dữ liệu.' });

    rows.forEach((raw, i) => {
      const rowNo = i + 2; // +1 header, +1 để khớp số dòng Excel
      const type = String(this.pick(raw, ['Type', 'type', 'Dạng'])).trim().toUpperCase();
      if (!type) return; // bỏ qua dòng trống hoàn toàn
      if (!VALID_TYPES.has(type)) {
        errors.push({ row: rowNo, message: `Dạng câu hỏi "${type}" không hợp lệ.` });
        return;
      }

      const options = [
        this.pick(raw, ['OptionA', 'optionA', 'A']),
        this.pick(raw, ['OptionB', 'optionB', 'B']),
        this.pick(raw, ['OptionC', 'optionC', 'C']),
        this.pick(raw, ['OptionD', 'optionD', 'D'])
      ]
        .map((o) => String(o).trim())
        .filter(Boolean);

      const correct = String(this.pick(raw, ['CorrectAnswer', 'correctAnswer', 'Answer', 'Đáp án'])).trim();
      const rowErr = this.validateQuestion(type as ExamQuestionType, options, correct, rowNo);
      if (rowErr) {
        errors.push(rowErr);
        return;
      }

      questions.push({
        questionType: type as ExamQuestionType,
        questionText: String(this.pick(raw, ['QuestionText', 'questionText', 'Câu hỏi'])).trim() || null,
        passageText: String(this.pick(raw, ['PassageText', 'passageText', 'Đoạn văn'])).trim() || null,
        options,
        correctAnswer: correct,
        explanation: String(this.pick(raw, ['Explanation', 'explanation', 'Giải thích'])).trim() || null
      });
    });

    const cleanTitle = title.trim();
    if (!cleanTitle) errors.push({ row: 0, message: 'Vui lòng nhập tên đề trước khi import.' });

    const exam: CreateExamInput | null =
      cleanTitle && questions.length > 0
        ? { title: cleanTitle, description: null, jlptLevel, timeLimitInSeconds, isPublic: false, questions }
        : null;

    return { exam, errors, questionCount: questions.length };
  }

  // ── Validate 1 câu hỏi ─────────────────────────────────────────────────
  private validateQuestion(
    type: ExamQuestionType,
    options: string[],
    correct: string,
    rowNo: number
  ): ImportRowError | null {
    if (!correct) return { row: rowNo, message: 'Thiếu đáp án đúng (correctAnswer).' };
    if (type === 'SENTENCE_ORDER') {
      if (options.length < 2) return { row: rowNo, message: 'Câu sắp xếp cần ít nhất 2 thành phần.' };
      return null;
    }
    if (options.length < 2) return { row: rowNo, message: 'Câu trắc nghiệm cần ít nhất 2 lựa chọn.' };
    if (!options.includes(correct)) {
      return { row: rowNo, message: 'Đáp án đúng không nằm trong danh sách lựa chọn.' };
    }
    return null;
  }

  private pick(row: Record<string, unknown>, keys: string[]): unknown {
    for (const k of keys) {
      if (row[k] !== undefined && row[k] !== null && String(row[k]).trim() !== '') return row[k];
    }
    return '';
  }

  private toNullableInt(value: number | string | null | undefined): number | null {
    if (value === null || value === undefined || value === '') return null;
    const n = Number(value);
    return Number.isFinite(n) ? Math.trunc(n) : null;
  }
}
