import { Injectable } from '@angular/core';
import { from, Observable, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
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
  radicalId?: number;
  radicalCharacter?: string;
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

const VOCAB_SELECT = `
  Id, FolderId, LanguageId, Word, Pronunciation, Meaning, SpecificData, CreatedAt,
  VocabularyFolder:FolderId(FolderName),
  Languages:LanguageId(LanguageCode, LanguageName),
  KanjiComponents:KanjiComponents(KanjiId, Kanji:KanjiId(Id, Character, AmHanViet, Radical:RadicalId(Id, RadicalCharacter)), "Order")
`;

@Injectable({ providedIn: 'root' })
export class VocabularyService {
  getVocabularies(query: VocabularyListQuery = {}): Observable<PagedResult<VocabularyDto>> {
    return from(this.fetchVocabularies(query));
  }

  getById(id: number): Observable<VocabularyDto> {
    return from(
      supabase
        .from('Vocabularies')
        .select(VOCAB_SELECT)
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

  // Lấy ngẫu nhiên từ vựng (dùng random offset để phân tán đều)
  getRandom(limit = 20): Observable<VocabularyDto[]> {
    const offset = Math.floor(Math.random() * 200) * limit;
    return from(
      supabase
        .from('Vocabularies')
        .select(VOCAB_SELECT)
        .range(offset, offset + limit - 1)
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        const rows = data ?? [];
        // Shuffle client-side
        for (let i = rows.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [rows[i], rows[j]] = [rows[j], rows[i]];
        }
        return rows.map((r) => this.mapRow(r));
      })
    );
  }

  // Tìm kiếm theo Word, Meaning, Pronunciation rồi xếp hạng ở client.
  // Supabase không có relevance ranking cho ilike; lấy cả exact candidates
  // trước khi lấy contains candidates để kết quả khớp chính xác không bị
  // loại khỏi giới hạn truy vấn ban đầu.
  searchGlobal(query: string, limit = 30): Observable<VocabularyDto[]> {
    return from(this.fetchSearchResults(query, limit));
  }

  private async fetchSearchResults(query: string, limit: number): Promise<VocabularyDto[]> {
    const rawQuery = query.trim();
    const normalizedQuery = this.normalizeSearchValue(rawQuery);
    if (!normalizedQuery) return [];

    const fields = ['Word', 'Meaning', 'Pronunciation'];
    const candidateLimit = Math.max(limit * 4, 100);
    const exactQueries = fields.map((field) =>
      supabase
        .from('Vocabularies')
        .select(VOCAB_SELECT)
        .ilike(field, rawQuery)
        .limit(candidateLimit)
    );
    const containsQueries = fields.map((field) =>
      supabase
        .from('Vocabularies')
        .select(VOCAB_SELECT)
        .ilike(field, `%${rawQuery}%`)
        .limit(candidateLimit)
    );

    const responses = await Promise.all([...exactQueries, ...containsQueries]);
    const rows = responses.flatMap((response) => {
      if (response.error) throw response.error;
      return response.data ?? [];
    });

    const unique = new Map<number, VocabularyDto>();
    for (const row of rows) {
      const vocab = this.mapRow(row);
      unique.set(vocab.id, vocab);
    }

    return [...unique.values()]
      .map((vocab) => ({ vocab, score: this.scoreSearchResult(vocab, normalizedQuery) }))
      .filter((entry) => entry.score > 0)
      .sort((a, b) => {
        const scoreDiff = b.score - a.score;
        if (scoreDiff !== 0) return scoreDiff;

        const lengthDiff = a.vocab.word.length - b.vocab.word.length;
        if (lengthDiff !== 0) return lengthDiff;
        return a.vocab.id - b.vocab.id;
      })
      .slice(0, limit)
      .map((entry) => entry.vocab);
  }

  private scoreSearchResult(vocab: VocabularyDto, query: string): number {
    const fields: Array<{ value: string; priority: number }> = [
      { value: vocab.word, priority: 500 },
      { value: vocab.pronunciation ?? '', priority: 400 },
      { value: vocab.meaning, priority: 300 },
      { value: this.getSpecificDataText(vocab, 'amHanViet'), priority: 250 },
      { value: this.getSpecificDataText(vocab, 'kanji'), priority: 200 },
      ...vocab.kanjiComponents.flatMap((component) => [
        { value: component.character, priority: 180 },
        { value: component.amHanViet, priority: 160 },
      ]),
    ];

    let bestScore = 0;
    for (const field of fields) {
      const value = this.normalizeSearchValue(field.value);
      if (!value) continue;

      if (value === query) {
        bestScore = Math.max(bestScore, 3000 + field.priority);
        continue;
      }

      const index = value.indexOf(query);
      if (index < 0) continue;

      const tier = index === 0 ? 2000 : 1000;
      const positionPenalty = Math.min(index, 100);
      bestScore = Math.max(bestScore, tier + field.priority - positionPenalty);
    }

    return bestScore;
  }

  private getSpecificDataText(vocab: VocabularyDto, key: string): string {
    const value = vocab.specificData?.[key];
    return typeof value === 'string' ? value : '';
  }

  private normalizeSearchValue(value: string): string {
    return value.trim().toLocaleLowerCase().replace(/\s+/g, ' ');
  }

  // Kiểm tra trạng thái bookmark của 1 từ vựng
  getBookmarkStatus(vocabularyId: number): Observable<boolean> {
    return from(this.getCurrentUserId()).pipe(
      switchMap((userId) =>
        from(
          supabase
            .from('VocabularyBookmarks')
            .select('Id')
            .eq('UserId', userId)
            .eq('VocabularyId', vocabularyId)
            .maybeSingle()
        )
      ),
      map(({ data }) => !!data),
      catchError(() => of(false))
    );
  }

  // Toggle bookmark (thêm/xóa yêu thích)
  toggleBookmark(vocabularyId: number): Observable<boolean> {
    return from(this.getCurrentUserId()).pipe(
      switchMap((userId) =>
        from(
          supabase
            .from('VocabularyBookmarks')
            .select('Id')
            .eq('UserId', userId)
            .eq('VocabularyId', vocabularyId)
            .maybeSingle()
        ).pipe(
          switchMap(({ data, error }) => {
            if (error) throw error;
            if (data) {
              return from(
                supabase.from('VocabularyBookmarks').delete().eq('Id', (data as { Id: number }).Id)
              ).pipe(map(() => false));
            }
            return from(
              supabase.from('VocabularyBookmarks').insert({
                UserId: userId,
                VocabularyId: vocabularyId,
                IsPinned: true,
                PinnedAt: new Date().toISOString(),
              })
            ).pipe(map(() => true));
          })
        )
      )
    );
  }

  // Kiểm tra từ vựng đã có trong SRS chưa
  getSRSStatus(vocabularyId: number): Observable<boolean> {
    return from(this.getCurrentUserId()).pipe(
      switchMap((userId) =>
        from(
          supabase
            .from('SRSCards')
            .select('Id')
            .eq('UserId', userId)
            .eq('VocabularyId', vocabularyId)
            .maybeSingle()
        )
      ),
      map(({ data }) => !!data),
      catchError(() => of(false))
    );
  }

  // Thêm từ vựng vào SRS (thuật toán SM-2 mặc định)
  addToSRS(vocabularyId: number): Observable<void> {
    return from(this.getCurrentUserId()).pipe(
      switchMap((userId) =>
        from(
          supabase.from('SRSCards').insert({
            UserId: userId,
            VocabularyId: vocabularyId,
            KanjiId: null,
            BoxLevel: 1,
            EaseFactor: 2.5,
            IntervalDays: 1,
            Repetitions: 0,
            NextReviewDate: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
          })
        )
      ),
      map(({ error }) => {
        if (error) throw error;
      })
    );
  }

  private async fetchVocabularies(query: VocabularyListQuery): Promise<PagedResult<VocabularyDto>> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const from_ = (page - 1) * pageSize;
    const to = from_ + pageSize - 1;

    let q = supabase
      .from('Vocabularies')
      .select(VOCAB_SELECT, { count: 'exact' });

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
      totalPages: Math.ceil(totalCount / pageSize),
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
        SpecificData: dto.specificData ?? null,
      })
      .select(VOCAB_SELECT)
      .single();

    if (error) throw error;
    const vocab = this.mapRow(data);

    if (dto.kanjiIds && dto.kanjiIds.length > 0) {
      const components = dto.kanjiIds.map((kanjiId, index) => ({
        VocabularyId: vocab.id,
        KanjiId: kanjiId,
        Order: index,
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
      .select(VOCAB_SELECT)
      .single();

    if (error) throw error;

    if (dto.kanjiIds !== undefined) {
      await supabase.from('KanjiComponents').delete().eq('VocabularyId', id);
      if (dto.kanjiIds.length > 0) {
        const components = dto.kanjiIds.map((kanjiId, index) => ({
          VocabularyId: id,
          KanjiId: kanjiId,
          Order: index,
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
      Kanji: { 
        Id: number; 
        Character: string; 
        AmHanViet: string;
        Radical?: { Id: number; RadicalCharacter: string } | null;
      };
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
      kanjiComponents: (comps ?? [])
        .sort((a, b) => a.Order - b.Order)
        .map((c) => ({
          kanjiId: c.Kanji.Id,
          character: c.Kanji.Character,
          amHanViet: c.Kanji.AmHanViet,
          order: c.Order,
          radicalId: c.Kanji.Radical?.Id,
          radicalCharacter: c.Kanji.Radical?.RadicalCharacter,
        })),
      isPinned: false,
    };
  }

  private async getCurrentUserId(): Promise<number> {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user?.email) throw new Error('Not authenticated');
    const { data: profile, error: pe } = await supabase
      .from('Users')
      .select('Id')
      .eq('Email', data.user.email)
      .maybeSingle();
    if (pe) throw pe;
    if (!profile) throw new Error('User profile not found — please reload the page');
    return (profile as { Id: number }).Id;
  }
}
