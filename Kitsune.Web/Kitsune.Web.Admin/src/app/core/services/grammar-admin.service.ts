import { Injectable } from '@angular/core';
import { from, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { supabase } from '../supabase/supabase.client';

export interface GrammarExampleDto {
  id: number;
  grammarId: number;
  japaneseText: string;
  reading: string | null;
  meaningVi: string | null;
  orderIndex: number;
}
export interface GrammarPointDto {
  id: number;
  title: string;
  meaning: string;
  structure: string | null;
  jlptLevel: number | null;
  explanation: string | null;
  isDeleted: boolean;
  createdAt: string;
  examples: GrammarExampleDto[];
}
export interface PagedResult<T> { items: T[]; totalCount: number; page: number; pageSize: number; totalPages: number; }
export interface GrammarListQuery { search?: string; jlptLevel?: number; includeDeleted?: boolean; page?: number; pageSize?: number; }
export interface GrammarExampleInput { japaneseText: string; reading?: string | null; meaningVi?: string | null; }
export interface CreateGrammarDto {
  title: string;
  meaning: string;
  structure?: string | null;
  jlptLevel?: number | null;
  explanation?: string | null;
  examples: GrammarExampleInput[];
}
export interface UpdateGrammarDto {
  title?: string;
  meaning?: string;
  structure?: string | null;
  jlptLevel?: number | null;
  explanation?: string | null;
  examples?: GrammarExampleInput[];
}

const GRAMMAR_SELECT = `
  Id, Title, Meaning, Structure, JlptLevel, Explanation, IsDeleted, CreatedAt,
  GrammarExamples(Id, GrammarId, JapaneseText, Reading, MeaningVi, OrderIndex)
`;

@Injectable({ providedIn: 'root' })
export class GrammarAdminService {
  getGrammarPoints(query: GrammarListQuery = {}): Observable<PagedResult<GrammarPointDto>> {
    return from(this.fetchGrammarPoints(query));
  }

  getById(id: number): Observable<GrammarPointDto> {
    return from(supabase.from('GrammarPoints').select(GRAMMAR_SELECT).eq('Id', id).single()).pipe(
      map(({ data, error }) => { if (error) throw error; return this.mapRow(data); })
    );
  }

  create(dto: CreateGrammarDto): Observable<GrammarPointDto> {
    return from(this.createInternal(dto));
  }

  update(id: number, dto: UpdateGrammarDto): Observable<GrammarPointDto> {
    return from(this.updateInternal(id, dto));
  }

  /** Soft-delete: mark IsDeleted = true. */
  softDelete(id: number): Observable<void> {
    return from(
      supabase.from('GrammarPoints').update({ IsDeleted: true, DeletedAt: new Date().toISOString() }).eq('Id', id)
    ).pipe(map(({ error }) => { if (error) throw error; }));
  }

  /** Restore a soft-deleted grammar point. */
  restore(id: number): Observable<void> {
    return from(
      supabase.from('GrammarPoints').update({ IsDeleted: false, DeletedAt: null }).eq('Id', id)
    ).pipe(map(({ error }) => { if (error) throw error; }));
  }

  private async createInternal(dto: CreateGrammarDto): Promise<GrammarPointDto> {
    const { data, error } = await supabase.from('GrammarPoints').insert({
      Title: dto.title,
      Meaning: dto.meaning,
      Structure: dto.structure ?? null,
      JlptLevel: dto.jlptLevel ?? null,
      Explanation: dto.explanation ?? null
    }).select('Id').single();
    if (error) throw error;
    const grammarId = (data as { Id: number }).Id;
    await this.replaceExamples(grammarId, dto.examples);
    return this.fetchOne(grammarId);
  }

  private async updateInternal(id: number, dto: UpdateGrammarDto): Promise<GrammarPointDto> {
    const patch: Record<string, unknown> = {};
    if (dto.title !== undefined) patch['Title'] = dto.title;
    if (dto.meaning !== undefined) patch['Meaning'] = dto.meaning;
    if (dto.structure !== undefined) patch['Structure'] = dto.structure;
    if (dto.jlptLevel !== undefined) patch['JlptLevel'] = dto.jlptLevel;
    if (dto.explanation !== undefined) patch['Explanation'] = dto.explanation;
    if (Object.keys(patch).length > 0) {
      const { error } = await supabase.from('GrammarPoints').update(patch).eq('Id', id);
      if (error) throw error;
    }
    if (dto.examples !== undefined) {
      await this.replaceExamples(id, dto.examples);
    }
    return this.fetchOne(id);
  }

  private async replaceExamples(grammarId: number, examples: GrammarExampleInput[]): Promise<void> {
    const { error: delError } = await supabase.from('GrammarExamples').delete().eq('GrammarId', grammarId);
    if (delError) throw delError;
    const clean = examples.filter((e) => e.japaneseText.trim().length > 0);
    if (clean.length === 0) return;
    const rows = clean.map((e, index) => ({
      GrammarId: grammarId,
      JapaneseText: e.japaneseText,
      Reading: e.reading ?? null,
      MeaningVi: e.meaningVi ?? null,
      OrderIndex: index
    }));
    const { error: insError } = await supabase.from('GrammarExamples').insert(rows);
    if (insError) throw insError;
  }

  private async fetchOne(id: number): Promise<GrammarPointDto> {
    const { data, error } = await supabase.from('GrammarPoints').select(GRAMMAR_SELECT).eq('Id', id).single();
    if (error) throw error;
    return this.mapRow(data);
  }

  private async fetchGrammarPoints(query: GrammarListQuery): Promise<PagedResult<GrammarPointDto>> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const from_ = (page - 1) * pageSize;
    const to = from_ + pageSize - 1;
    let q = supabase.from('GrammarPoints').select(GRAMMAR_SELECT, { count: 'exact' });
    if (!query.includeDeleted) q = q.eq('IsDeleted', false);
    if (query.jlptLevel != null) q = q.eq('JlptLevel', query.jlptLevel);
    if (query.search) q = q.or(`Title.ilike.%${query.search}%,Meaning.ilike.%${query.search}%`);
    const { data, error, count } = await q.range(from_, to).order('CreatedAt', { ascending: false });
    if (error) throw error;
    const totalCount = count ?? 0;
    return { items: (data ?? []).map((r) => this.mapRow(r)), totalCount, page, pageSize, totalPages: Math.ceil(totalCount / pageSize) };
  }

  private mapRow(r: Record<string, unknown>): GrammarPointDto {
    const examples = (r['GrammarExamples'] as Array<Record<string, unknown>> | null) ?? [];
    return {
      id: r['Id'] as number,
      title: r['Title'] as string,
      meaning: r['Meaning'] as string,
      structure: (r['Structure'] as string | null) ?? null,
      jlptLevel: (r['JlptLevel'] as number | null) ?? null,
      explanation: (r['Explanation'] as string | null) ?? null,
      isDeleted: (r['IsDeleted'] as boolean) ?? false,
      createdAt: r['CreatedAt'] as string,
      examples: examples
        .map((e) => ({
          id: e['Id'] as number,
          grammarId: e['GrammarId'] as number,
          japaneseText: e['JapaneseText'] as string,
          reading: (e['Reading'] as string | null) ?? null,
          meaningVi: (e['MeaningVi'] as string | null) ?? null,
          orderIndex: (e['OrderIndex'] as number) ?? 0
        }))
        .sort((a, b) => a.orderIndex - b.orderIndex)
    };
  }
}
