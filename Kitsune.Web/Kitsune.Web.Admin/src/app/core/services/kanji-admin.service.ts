import { Injectable, inject } from '@angular/core';
import { from, Observable } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { supabase } from '../supabase/supabase.client';
import { JsonlExportProgress, JsonlExportResult, JsonlExportService } from './jsonl-export.service';

export interface RadicalDto { id: number; radicalCharacter: string; radicalName: string; englishName: string | null; description: string | null; }
export interface PagedResult<T> { items: T[]; totalCount: number; page: number; pageSize: number; totalPages: number; }
export interface KanjiListQuery { search?: string; radicalId?: number; jlptLevel?: number; page?: number; pageSize?: number; }
export interface CreateKanjiDto { character: string; onyomi?: string | null; kunyomi?: string | null; amHanViet: string; meaning: string; strokeCount: number; jlptLevel?: number | null; mnemonic?: string | null; radicalId?: number | null; }
export interface UpdateKanjiDto { onyomi?: string | null; kunyomi?: string | null; amHanViet?: string; meaning?: string; strokeCount?: number; jlptLevel?: number | null; mnemonic?: string | null; radicalId?: number | null; clearRadical?: boolean; }
export interface CreateRadicalDto { radicalCharacter: string; radicalName: string; englishName?: string | null; description?: string | null; }
export interface UpdateRadicalDto { radicalCharacter?: string; radicalName?: string; englishName?: string | null; description?: string | null; }
export interface KanjiDto { id: number; character: string; onyomi: string | null; kunyomi: string | null; amHanViet: string; meaning: string; strokeCount: number; jlptLevel: number | null; mnemonic: string | null; radical: RadicalDto | null; }
export interface KanjiExportRadical { Id: number; RadicalCharacter: string; RadicalName: string; EnglishName: string | null; Description: string | null; }
export interface KanjiExportRecord {
  Id: number;
  Character: string;
  Onyomi: string | null;
  Kunyomi: string | null;
  AmHanViet: string;
  Meaning: string;
  StrokeCount: number;
  JlptLevel: number | null;
  Mnemonic: string | null;
  RadicalId: number | null;
  Radical: KanjiExportRadical | null;
}
export interface KanjiImportSummaryDto { sourceDirectory: string; radicalCount: number; kanjiCount: number; }
export interface KanjiImportProgressDto { stage: string; message: string; currentCharacter?: string | null; currentFileName?: string | null; currentFileIndex: number; totalFiles: number; processedRecords: number; totalRecords: number; radicalCount: number; kanjiCount: number; isCompleted: boolean; isWarning: boolean; isError: boolean; }
export interface KanjiImportLogEntry { id: string; timestamp: string; stage: string; message: string; currentCharacter?: string | null; currentFileName?: string | null; tone: 'info' | 'warning' | 'error' | 'success'; }
export type KanjiImportStreamMessage = | { type: 'progress'; payload: KanjiImportProgressDto } | { type: 'complete'; payload: KanjiImportSummaryDto } | { type: 'error'; payload: { message: string } };

// ✅ Correct select: table is 'Radical' (singular), join via alias Radical:RadicalId(...)
// JlptLevel (not JLPTLevel) matches the schema column
const KANJI_SELECT = `
  Id, Character, Onyomi, Kunyomi, AmHanViet, Meaning, StrokeCount, JlptLevel, Mnemonic, RadicalId,
  Radical:RadicalId(Id, RadicalCharacter, RadicalName, EnglishName, Description)
`;
const KANJI_EXPORT_PAGE_SIZE = 500;

@Injectable({ providedIn: 'root' })
export class KanjiAdminService {
  private readonly jsonlExportService = inject(JsonlExportService);

  // ✅ Table 'Radical' (singular)
  radicals(): Observable<RadicalDto[]> {
    return from(
      supabase.from('Radical').select('Id, RadicalCharacter, RadicalName, EnglishName, Description').order('RadicalName')
    ).pipe(map(({ data, error }) => {
      if (error) throw error;
      return (data ?? []).map((r) => ({
        id: r['Id'] as number, radicalCharacter: r['RadicalCharacter'] as string,
        radicalName: r['RadicalName'] as string, englishName: (r['EnglishName'] as string | null) ?? null,
        description: (r['Description'] as string | null) ?? null
      }));
    }));
  }

  getKanjis(query: KanjiListQuery = {}): Observable<PagedResult<KanjiDto>> { return from(this.fetchKanjis(query)); }

  getById(id: number): Observable<KanjiDto> {
    return from(supabase.from('Kanji').select(KANJI_SELECT).eq('Id', id).single()).pipe(
      map(({ data, error }) => { if (error) throw error; return this.mapKanjiRow(data); })
    );
  }

  exportJsonl(onProgress?: (progress: JsonlExportProgress) => void): Promise<JsonlExportResult> {
    return this.jsonlExportService.downloadFromPages(
      this.jsonlExportService.createTimestampedFilename('kitsune-kanji'),
      (offset, limit) => this.fetchKanjiExportPage(offset, limit),
      {
        pageSize: KANJI_EXPORT_PAGE_SIZE,
        getTotalCount: () => this.fetchKanjiExportCount(),
        onProgress
      }
    );
  }

  createKanji(dto: CreateKanjiDto): Observable<KanjiDto> {
    return from(supabase.from('Kanji').select('Id').order('Id', { ascending: false }).limit(1).maybeSingle()).pipe(
      switchMap(({ data: maxData, error: maxError }) => {
        if (maxError) throw maxError;
        const nextId = ((maxData as { Id: number })?.Id ?? 0) + 1;
        
        return from(
          supabase.from('Kanji').insert({
            Id: nextId, Character: dto.character, Onyomi: dto.onyomi ?? null, Kunyomi: dto.kunyomi ?? null,
            AmHanViet: dto.amHanViet, Meaning: dto.meaning, StrokeCount: dto.strokeCount,
            JlptLevel: dto.jlptLevel ?? null, Mnemonic: dto.mnemonic ?? null, RadicalId: dto.radicalId ?? null
          }).select(KANJI_SELECT).single()
        ).pipe(map(({ data, error }) => { if (error) throw error; return this.mapKanjiRow(data); }));
      })
    );
  }

  updateKanji(id: number, dto: UpdateKanjiDto): Observable<KanjiDto> {
    const patch: Record<string, unknown> = {};
    if (dto.onyomi !== undefined) patch['Onyomi'] = dto.onyomi;
    if (dto.kunyomi !== undefined) patch['Kunyomi'] = dto.kunyomi;
    if (dto.amHanViet !== undefined) patch['AmHanViet'] = dto.amHanViet;
    if (dto.meaning !== undefined) patch['Meaning'] = dto.meaning;
    if (dto.strokeCount !== undefined) patch['StrokeCount'] = dto.strokeCount;
    if (dto.jlptLevel !== undefined) patch['JlptLevel'] = dto.jlptLevel;
    if (dto.mnemonic !== undefined) patch['Mnemonic'] = dto.mnemonic;
    if (dto.clearRadical) patch['RadicalId'] = null;
    else if (dto.radicalId !== undefined) patch['RadicalId'] = dto.radicalId;

    return from(supabase.from('Kanji').update(patch).eq('Id', id).select(KANJI_SELECT).single()).pipe(
      map(({ data, error }) => { if (error) throw error; return this.mapKanjiRow(data); })
    );
  }

  deleteKanji(id: number): Observable<void> {
    return from(supabase.from('Kanji').delete().eq('Id', id)).pipe(map(({ error }) => { if (error) throw error; }));
  }

  createRadical(dto: CreateRadicalDto): Observable<RadicalDto> {
    return from(supabase.from('Radical').select('Id').order('Id', { ascending: false }).limit(1).maybeSingle()).pipe(
      switchMap(({ data: maxData, error: maxError }) => {
        if (maxError) throw maxError;
        const nextId = ((maxData as { Id: number })?.Id ?? 0) + 1;

        return from(
          supabase.from('Radical').insert({
            Id: nextId, RadicalCharacter: dto.radicalCharacter, RadicalName: dto.radicalName,
            EnglishName: dto.englishName ?? null, Description: dto.description ?? null
          }).select('Id, RadicalCharacter, RadicalName, EnglishName, Description').single()
        ).pipe(map(({ data, error }) => {
          if (error) throw error;
          return { id: data['Id'] as number, radicalCharacter: data['RadicalCharacter'] as string, radicalName: data['RadicalName'] as string, englishName: (data['EnglishName'] as string | null) ?? null, description: (data['Description'] as string | null) ?? null };
        }));
      })
    );
  }

  updateRadical(id: number, dto: UpdateRadicalDto): Observable<RadicalDto> {
    const patch: Record<string, unknown> = {};
    if (dto.radicalCharacter !== undefined) patch['RadicalCharacter'] = dto.radicalCharacter;
    if (dto.radicalName !== undefined) patch['RadicalName'] = dto.radicalName;
    if (dto.englishName !== undefined) patch['EnglishName'] = dto.englishName;
    if (dto.description !== undefined) patch['Description'] = dto.description;

    return from(supabase.from('Radical').update(patch).eq('Id', id).select('Id, RadicalCharacter, RadicalName, EnglishName, Description').single()).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return { id: data['Id'] as number, radicalCharacter: data['RadicalCharacter'] as string, radicalName: data['RadicalName'] as string, englishName: (data['EnglishName'] as string | null) ?? null, description: (data['Description'] as string | null) ?? null };
      })
    );
  }

  deleteRadical(id: number): Observable<void> {
    return from(supabase.from('Radical').delete().eq('Id', id)).pipe(map(({ error }) => { if (error) throw error; }));
  }

  async importFromDirectoryStreamJson(sourceDir: string | undefined, onMessage: (message: KanjiImportStreamMessage) => void, signal?: AbortSignal): Promise<void> {
    const { data, error } = await supabase.functions.invoke('import-kanji-stream', { body: { sourceDir } });
    if (error) throw new Error(error.message);
    const messages = data as KanjiImportStreamMessage[];
    for (const msg of messages) { if (signal?.aborted) break; onMessage(msg); }
  }

  private async fetchKanjis(query: KanjiListQuery): Promise<PagedResult<KanjiDto>> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const from_ = (page - 1) * pageSize;
    const to = from_ + pageSize - 1;

    let q = supabase.from('Kanji').select(KANJI_SELECT, { count: 'exact' });
    if (query.radicalId != null) q = q.eq('RadicalId', query.radicalId);
    if (query.jlptLevel != null) q = q.eq('JlptLevel', query.jlptLevel);
    if (query.search) q = q.or(`Character.ilike.%${query.search}%,AmHanViet.ilike.%${query.search}%,Meaning.ilike.%${query.search}%`);

    const { data, error, count } = await q.range(from_, to).order('Character');
    if (error) throw error;
    const totalCount = count ?? 0;
    return { items: (data ?? []).map((r) => this.mapKanjiRow(r)), totalCount, page, pageSize, totalPages: Math.ceil(totalCount / pageSize) };
  }

  private async fetchKanjiExportPage(offset: number, limit: number): Promise<KanjiExportRecord[]> {
    const { data, error } = await supabase
      .from('Kanji')
      .select(KANJI_SELECT)
      .order('Id', { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    return (data ?? []).map((row) => this.mapKanjiExportRow(row as Record<string, unknown>));
  }

  private async fetchKanjiExportCount(): Promise<number> {
    const { count, error } = await supabase
      .from('Kanji')
      .select('Id', { count: 'exact', head: true });

    if (error) throw error;
    return count ?? 0;
  }

  private mapKanjiExportRow(row: Record<string, unknown>): KanjiExportRecord {
    const rawRadical = row['Radical'];
    const radical = rawRadical && typeof rawRadical === 'object' && !Array.isArray(rawRadical)
      ? (rawRadical as Record<string, unknown>)
      : null;

    return {
      Id: row['Id'] as number,
      Character: row['Character'] as string,
      Onyomi: (row['Onyomi'] as string | null) ?? null,
      Kunyomi: (row['Kunyomi'] as string | null) ?? null,
      AmHanViet: row['AmHanViet'] as string,
      Meaning: row['Meaning'] as string,
      StrokeCount: row['StrokeCount'] as number,
      JlptLevel: (row['JlptLevel'] as number | null) ?? null,
      Mnemonic: (row['Mnemonic'] as string | null) ?? null,
      RadicalId: (row['RadicalId'] as number | null) ?? null,
      Radical: radical
        ? {
            Id: radical['Id'] as number,
            RadicalCharacter: radical['RadicalCharacter'] as string,
            RadicalName: radical['RadicalName'] as string,
            EnglishName: (radical['EnglishName'] as string | null) ?? null,
            Description: (radical['Description'] as string | null) ?? null
          }
        : null
    };
  }

  private mapKanjiRow(r: Record<string, unknown>): KanjiDto {
    const radical = r['Radical'] as { Id: number; RadicalCharacter: string; RadicalName: string; EnglishName: string | null; Description: string | null } | null;
    return {
      id: r['Id'] as number, character: r['Character'] as string,
      onyomi: (r['Onyomi'] as string | null) ?? null, kunyomi: (r['Kunyomi'] as string | null) ?? null,
      amHanViet: r['AmHanViet'] as string, meaning: r['Meaning'] as string,
      strokeCount: r['StrokeCount'] as number,
      jlptLevel: (r['JlptLevel'] as number | null) ?? null,
      mnemonic: (r['Mnemonic'] as string | null) ?? null,
      radical: radical ? { id: radical.Id, radicalCharacter: radical.RadicalCharacter, radicalName: radical.RadicalName, englishName: radical.EnglishName, description: radical.Description } : null
    };
  }
}
