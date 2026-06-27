import { Injectable } from '@angular/core';
import { from, Observable } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { supabase } from '../supabase/supabase.client';

export interface VocabularyDto {
  id: number;
  folderId: number;
  folderName: string;
  languageId: number;
  languageCode: string;
  languageName: string;
  word: string;
  pronunciation: string | null;
  meaning: string;
  specificData: Record<string, unknown> | null;
  createdAt: string;
  kanjiComponents: KanjiComponentDto[];
  isPinned: boolean;
}

export interface KanjiComponentDto {
  kanjiId: number;
  character: string;
  amHanViet: string;
  order: number;
}

export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface VocabularyListQuery {
  search?: string;
  folderId?: number;
  languageId?: number;
  page?: number;
  pageSize?: number;
}

export interface CreateVocabularyDto {
  folderId: number;
  languageId: number;
  word: string;
  pronunciation?: string | null;
  meaning: string;
  specificData?: Record<string, unknown> | null;
  kanjiIds?: number[];
}

export interface UpdateVocabularyDto {
  word?: string;
  pronunciation?: string | null;
  meaning?: string;
  specificData?: Record<string, unknown> | null;
  kanjiIds?: number[];
}

@Injectable({ providedIn: 'root' })
export class VocabularyService {
  getVocabularies(query: VocabularyListQuery = {}): Observable<PagedResult<VocabularyDto>> {
    return from(this.fetchVocabularies(query));
  }

  getById(id: number): Observable<VocabularyDto> {
    return from(
      supabase
        .from('Vocabularies')
        .select(`
          Id, FolderId, LanguageId, Word, Pronunciation, Meaning, SpecificData, CreatedAt,
          VocabularyFolder:FolderId(FolderName),
          Languages:LanguageId(LanguageCode, LanguageName),
          KanjiComponents:KanjiComponents(KanjiId, Kanji:KanjiId(Id, Character, AmHanViet), "Order")
        `)
        .eq('Id', id)
        .single()
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return this.mapRow(data);
      })
    );
  }

  create(dto: CreateVocabularyDto): Observable<VocabularyDto> {
    return from(this.insertVocabulary(dto));
  }

  update(id: number, dto: UpdateVocabularyDto): Observable<VocabularyDto> {
    return from(this.updateVocabulary(id, dto));
  }

  delete(id: number): Observable<void> {
    return from(supabase.from('Vocabularies').delete().eq('Id', id)).pipe(
      map(({ error }) => {
        if (error) throw error;
      })
    );
  }

  searchGlobal(query: string, limit = 20): Observable<VocabularyDto[]> {
    return from(
      supabase
        .from('Vocabularies')
        .select(`
          Id, FolderId, LanguageId, Word, Pronunciation, Meaning, SpecificData, CreatedAt,
          VocabularyFolder:FolderId(FolderName),
          Languages:LanguageId(LanguageCode, LanguageName),
          KanjiComponents:KanjiComponents(KanjiId, Kanji:KanjiId(Id, Character, AmHanViet), "Order")
        `)
        .ilike('Word', `%${query}%`)
        .limit(limit)
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return (data ?? []).map((r) => this.mapRow(r));
      })
    );
  }

  toggleBookmark(vocabularyId: number): Observable<boolean> {
    return from(this.getCurrentUserId()).pipe(
      switchMap((userId) =>
        from(
          supabase
            .from('VocabularyBookmarks')
            .select('Id, IsPinned')
            .eq('UserId', userId)
            .eq('VocabularyId', vocabularyId)
            .maybeSingle()
        )
      ),
      switchMap(({ data, error }) => {
        if (error) throw error;
        if (data) {
          return from(supabase.from('VocabularyBookmarks').delete().eq('Id', data['Id'] as number));
        }
        return from(
          supabase.from('VocabularyBookmarks').insert({
            UserId: 0,
            VocabularyId: vocabularyId,
            IsPinned: true,
            PinnedAt: new Date().toISOString()
          })
        );
      }),
      map(() => true)
    );
  }

  private async fetchVocabularies(query: VocabularyListQuery): Promise<PagedResult<VocabularyDto>> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const from_ = (page - 1) * pageSize;
    const to = from_ + pageSize - 1;

    let q = supabase
      .from('Vocabularies')
      .select(`
        Id, FolderId, LanguageId, Word, Pronunciation, Meaning, SpecificData, CreatedAt,
        VocabularyFolder:FolderId(FolderName),
        Languages:LanguageId(LanguageCode, LanguageName),
        KanjiComponents:KanjiComponents(KanjiId, Kanji:KanjiId(Id, Character, AmHanViet), "Order")
      `, { count: 'exact' });

    if (query.folderId != null) q = q.eq('FolderId', query.folderId);
    if (query.languageId != null) q = q.eq('LanguageId', query.languageId);
    if (query.search) q = q.ilike('Word', `%${query.search}%`);

    const { data, error, count } = await q.range(from_, to).order('CreatedAt', { ascending: false });
    if (error) throw error;

    const userId = await this.getCurrentUserId();
    const vocabIds = (data ?? []).map((r) => r.Id as number);
    let pinnedSet = new Set<number>();
    if (vocabIds.length > 0) {
      const { data: bm } = await supabase
        .from('VocabularyBookmarks')
        .select('VocabularyId')
        .eq('UserId', userId)
        .in('VocabularyId', vocabIds);
      pinnedSet = new Set((bm ?? []).map((b) => b.VocabularyId as number));
    }

    const totalCount = count ?? 0;
    return {
      items: (data ?? []).map((r) => ({ ...this.mapRow(r), isPinned: pinnedSet.has(r.Id as number) })),
      totalCount,
      page,
      pageSize,
      totalPages: Math.ceil(totalCount / pageSize)
    };
  }

  private async insertVocabulary(dto: CreateVocabularyDto): Promise<VocabularyDto> {
    const { data, error } = await supabase
      .from('Vocabularies')
      .insert({
        FolderId: dto.folderId,
        LanguageId: dto.languageId,
        Word: dto.word,
        Pronunciation: dto.pronunciation ?? null,
        Meaning: dto.meaning,
        SpecificData: dto.specificData ?? null
      })
      .select(`
        Id, FolderId, LanguageId, Word, Pronunciation, Meaning, SpecificData, CreatedAt,
        VocabularyFolder:FolderId(FolderName),
        Languages:LanguageId(LanguageCode, LanguageName),
        KanjiComponents:KanjiComponents(KanjiId, Kanji:KanjiId(Id, Character, AmHanViet), "Order")
      `)
      .single();

    if (error) throw error;
    const vocab = this.mapRow(data);

    if (dto.kanjiIds && dto.kanjiIds.length > 0) {
      const components = dto.kanjiIds.map((kanjiId, index) => ({
        VocabularyId: vocab.id,
        KanjiId: kanjiId,
        Order: index
      }));
      const { error: ce } = await supabase.from('KanjiComponents').insert(components);
      if (ce) throw ce;
    }
    return vocab;
  }

  private async updateVocabulary(id: number, dto: UpdateVocabularyDto): Promise<VocabularyDto> {
    const patch: Record<string, unknown> = {};
    if (dto.word !== undefined) patch['Word'] = dto.word;
    if (dto.pronunciation !== undefined) patch['Pronunciation'] = dto.pronunciation;
    if (dto.meaning !== undefined) patch['Meaning'] = dto.meaning;
    if (dto.specificData !== undefined) patch['SpecificData'] = dto.specificData;

    const { data, error } = await supabase
      .from('Vocabularies')
      .update(patch)
      .eq('Id', id)
      .select(`
        Id, FolderId, LanguageId, Word, Pronunciation, Meaning, SpecificData, CreatedAt,
        VocabularyFolder:FolderId(FolderName),
        Languages:LanguageId(LanguageCode, LanguageName),
        KanjiComponents:KanjiComponents(KanjiId, Kanji:KanjiId(Id, Character, AmHanViet), "Order")
      `)
      .single();

    if (error) throw error;

    if (dto.kanjiIds !== undefined) {
      await supabase.from('KanjiComponents').delete().eq('VocabularyId', id);
      if (dto.kanjiIds.length > 0) {
        const components = dto.kanjiIds.map((kanjiId, index) => ({
          VocabularyId: id,
          KanjiId: kanjiId,
          Order: index
        }));
        const { error: ce } = await supabase.from('KanjiComponents').insert(components);
        if (ce) throw ce;
      }
    }
    return this.mapRow(data);
  }

  private mapRow(r: Record<string, unknown>): VocabularyDto {
    const folder = r['VocabularyFolder'] as { FolderName: string } | null;
    const lang = r['Languages'] as { LanguageCode: string; LanguageName: string } | null;
    const comps = r['KanjiComponents'] as Array<{
      Order: number;
      Kanji: { Id: number; Character: string; AmHanViet: string };
    }> | null;

    return {
      id: r['Id'] as number,
      folderId: r['FolderId'] as number,
      folderName: folder?.FolderName ?? '',
      languageId: r['LanguageId'] as number,
      languageCode: lang?.LanguageCode ?? '',
      languageName: lang?.LanguageName ?? '',
      word: r['Word'] as string,
      pronunciation: (r['Pronunciation'] as string | null) ?? null,
      meaning: r['Meaning'] as string,
      specificData: (r['SpecificData'] as Record<string, unknown> | null) ?? null,
      createdAt: r['CreatedAt'] as string,
      kanjiComponents: (comps ?? []).map((c) => ({
        kanjiId: c.Kanji.Id,
        character: c.Kanji.Character,
        amHanViet: c.Kanji.AmHanViet,
        order: c.Order
      })),
      isPinned: false
    };
  }

  private async getCurrentUserId(): Promise<number> {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw new Error('Not authenticated');
    const { data: profile } = await supabase
      .from('Users')
      .select('Id')
      .eq('AuthUserId', data.user.id)
      .single();
    if (!profile) throw new Error('User profile not found');
    return profile['Id'] as number;
  }
}
