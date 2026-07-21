import { Injectable } from '@angular/core';
import { from, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { supabase } from '../supabase/supabase.client';

export interface GrammarExampleDto {
  id: number;
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
  examples: GrammarExampleDto[];
}

const GRAMMAR_SELECT = `
  Id, Title, Meaning, Structure, JlptLevel, Explanation,
  GrammarExamples(Id, JapaneseText, Reading, MeaningVi, OrderIndex)
`;

@Injectable({ providedIn: 'root' })
export class GrammarService {
  /** Tra cứu ngữ pháp công khai (chỉ mục chưa xóa mềm). */
  search(query: string, jlptLevel: number | null = null, limit = 50): Observable<GrammarPointDto[]> {
    const q = query.trim();
    let builder = supabase
      .from('GrammarPoints')
      .select(GRAMMAR_SELECT)
      .eq('IsDeleted', false);

    if (jlptLevel !== null) {
      builder = builder.eq('JlptLevel', jlptLevel);
    }
    if (q) {
      builder = builder.or(`Title.ilike.%${q}%,Meaning.ilike.%${q}%,Structure.ilike.%${q}%`);
    }

    return from(builder.order('JlptLevel', { ascending: false }).limit(limit)).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return (data as Record<string, unknown>[]).map((r) => this.mapRow(r));
      })
    );
  }

  getById(id: number): Observable<GrammarPointDto> {
    return from(
      supabase.from('GrammarPoints').select(GRAMMAR_SELECT).eq('Id', id).eq('IsDeleted', false).single()
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return this.mapRow(data as Record<string, unknown>);
      })
    );
  }

  private mapRow(r: Record<string, unknown>): GrammarPointDto {
    const rawExamples = (r['GrammarExamples'] as Array<Record<string, unknown>> | null) ?? [];
    const examples: GrammarExampleDto[] = rawExamples
      .map((e) => ({
        id: e['Id'] as number,
        japaneseText: e['JapaneseText'] as string,
        reading: (e['Reading'] as string | null) ?? null,
        meaningVi: (e['MeaningVi'] as string | null) ?? null,
        orderIndex: (e['OrderIndex'] as number) ?? 0
      }))
      .sort((a, b) => a.orderIndex - b.orderIndex);

    return {
      id: r['Id'] as number,
      title: r['Title'] as string,
      meaning: r['Meaning'] as string,
      structure: (r['Structure'] as string | null) ?? null,
      jlptLevel: (r['JlptLevel'] as number | null) ?? null,
      explanation: (r['Explanation'] as string | null) ?? null,
      examples
    };
  }
}
