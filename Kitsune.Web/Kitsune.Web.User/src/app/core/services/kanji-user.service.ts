import { Injectable } from '@angular/core';
import { from, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { supabase } from '../supabase/supabase.client';

export interface KanjiDetailDto {
  id: number;
  character: string;
  onyomi: string | null;
  kunyomi: string | null;
  amHanViet: string;
  meaning: string;
  strokeCount: number;
  jlptLevel: number | null;
  mnemonic: string | null;
  radical: {
    id: number;
    radicalCharacter: string;
    radicalName: string;
    englishName: string | null;
    description: string | null;
  } | null;
}

@Injectable({ providedIn: 'root' })
export class KanjiUserService {
  getById(id: number): Observable<KanjiDetailDto> {
    return from(
      supabase
        .from('Kanji')
        .select(`
          Id, Character, Onyomi, Kunyomi, AmHanViet, Meaning, StrokeCount, JlptLevel, Mnemonic,
          Radical:RadicalId(Id, RadicalCharacter, RadicalName, EnglishName, Description)
        `)
        .eq('Id', id)
        .single()
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return this.mapRow(data as Record<string, unknown>);
      })
    );
  }

  findByCharacter(character: string): Observable<KanjiDetailDto | null> {
    const q = character.trim();
    if (!q) return from(Promise.resolve(null));

    return from(
      supabase
        .from('Kanji')
        .select(`
          Id, Character, Onyomi, Kunyomi, AmHanViet, Meaning, StrokeCount, JlptLevel, Mnemonic,
          Radical:RadicalId(Id, RadicalCharacter, RadicalName, EnglishName, Description)
        `)
        .eq('Character', q)
        .maybeSingle()
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return data ? this.mapRow(data as Record<string, unknown>) : null;
      })
    );
  }

  search(query: string, limit = 40): Observable<KanjiDetailDto[]> {
    const q = query.trim();
    return from(
      supabase
        .from('Kanji')
        .select(`
          Id, Character, Onyomi, Kunyomi, AmHanViet, Meaning, StrokeCount, JlptLevel, Mnemonic,
          Radical:RadicalId(Id, RadicalCharacter, RadicalName, EnglishName, Description)
        `)
        .or(`Character.ilike.%${q}%,AmHanViet.ilike.%${q}%,Meaning.ilike.%${q}%`)
        .limit(limit)
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return (data as Record<string, unknown>[]).map((r) => this.mapRow(r));
      })
    );
  }

  getRandom(limit = 40): Observable<KanjiDetailDto[]> {
    // Cap offset to avoid exceeding table size (typical kanji table has ~2000 entries)
    const maxOffset = 40;
    const offset = Math.floor(Math.random() * maxOffset) * limit;
    return from(
      supabase
        .from('Kanji')
        .select(`
          Id, Character, Onyomi, Kunyomi, AmHanViet, Meaning, StrokeCount, JlptLevel, Mnemonic,
          Radical:RadicalId(Id, RadicalCharacter, RadicalName, EnglishName, Description)
        `)
        .range(offset, offset + limit - 1)
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        const rows = (data as Record<string, unknown>[]);
        // If random offset exceeded table size, retry from start
        if (rows.length === 0 && offset > 0) {
          return [] as KanjiDetailDto[];
        }
        return rows.map((r) => this.mapRow(r));
      })
    );
  }

  getFirst(limit = 40): Observable<KanjiDetailDto[]> {
    return from(
      supabase
        .from('Kanji')
        .select(`
          Id, Character, Onyomi, Kunyomi, AmHanViet, Meaning, StrokeCount, JlptLevel, Mnemonic,
          Radical:RadicalId(Id, RadicalCharacter, RadicalName, EnglishName, Description)
        `)
        .limit(limit)
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return (data as Record<string, unknown>[]).map((r) => this.mapRow(r));
      })
    );
  }

  private mapRow(r: Record<string, unknown>): KanjiDetailDto {
    const radical = r['Radical'] as {
      Id: number;
      RadicalCharacter: string;
      RadicalName: string;
      EnglishName: string | null;
      Description: string | null;
    } | null;

    return {
      id: r['Id'] as number,
      character: r['Character'] as string,
      onyomi: (r['Onyomi'] as string | null) ?? null,
      kunyomi: (r['Kunyomi'] as string | null) ?? null,
      amHanViet: r['AmHanViet'] as string,
      meaning: r['Meaning'] as string,
      strokeCount: r['StrokeCount'] as number,
      jlptLevel: (r['JlptLevel'] as number | null) ?? null,
      mnemonic: (r['Mnemonic'] as string | null) ?? null,
      radical: radical
        ? {
            id: radical.Id,
            radicalCharacter: radical.RadicalCharacter,
            radicalName: radical.RadicalName,
            englishName: radical.EnglishName,
            description: radical.Description,
          }
        : null,
    };
  }
}
