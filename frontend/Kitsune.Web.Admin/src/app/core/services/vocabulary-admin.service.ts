import { Injectable } from '@angular/core';
import { from, Observable, throwError } from 'rxjs';
import { map } from 'rxjs/operators';
import { supabase } from '../supabase/supabase.client';

export interface LanguageDto { id: number; languageCode: string; languageName: string; }
export interface VocabularyFolderDto { id: number; userId: number; folderName: string; description: string | null; isPublic: boolean; createdAt: string; vocabularyCount: number; }
export interface KanjiComponentDto { kanjiId: number; character: string; amHanViet: string; order: number; }
export interface VocabularyDto { id: number; folderId: number; folderName: string; languageId: number; languageCode: string; word: string; pronunciation: string | null; meaning: string; specificData: string | null; createdAt: string; kanjiComponents: KanjiComponentDto[]; }
export interface PagedResult<T> { items: T[]; totalCount: number; page: number; pageSize: number; totalPages: number; }
export interface VocabularyListQuery { search?: string; folderId?: number; languageId?: number; page?: number; pageSize?: number; }
export interface CreateVocabularyDto { folderId: number; languageId: number; word: string; pronunciation?: string | null; meaning: string; specificData?: string | null; }
export interface UpdateVocabularyDto { word?: string; pronunciation?: string | null; meaning?: string; specificData?: string | null; }
export interface CreateFolderDto { folderName: string; description?: string | null; isPublic?: boolean; }

@Injectable({ providedIn: 'root' })
export class VocabularyAdminService {
  getLanguages(): Observable<LanguageDto[]> {
    return from(supabase.from('Languages').select('Id, LanguageCode, LanguageName').order('LanguageName')).pipe(
      map(({ data, error }) => { if (error) throw error; return (data ?? []).map((r) => ({ id: r['Id'] as number, languageCode: r['LanguageCode'] as string, languageName: r['LanguageName'] as string })); })
    );
  }

  getFolders(): Observable<VocabularyFolderDto[]> {
    return from(supabase.from('VocabularyFolders').select('Id, UserId, FolderName, Description, IsPublic, CreatedAt, Vocabularies(count)').order('FolderName')).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return (data ?? []).map((r) => ({
          id: r['Id'] as number, userId: r['UserId'] as number, folderName: r['FolderName'] as string,
          description: (r['Description'] as string | null) ?? null, isPublic: (r['IsPublic'] as boolean) ?? false,
          createdAt: r['CreatedAt'] as string, vocabularyCount: (r['Vocabularies'] as Array<{ count: number }>)?.[0]?.count ?? 0
        }));
      })
    );
  }

  createFolder(dto: CreateFolderDto): Observable<VocabularyFolderDto> {
    return from(supabase.from('VocabularyFolders').insert({ FolderName: dto.folderName, Description: dto.description ?? null, IsPublic: dto.isPublic ?? false }).select('Id, UserId, FolderName, Description, IsPublic, CreatedAt').single()).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return { id: data['Id'] as number, userId: data['UserId'] as number, folderName: data['FolderName'] as string, description: (data['Description'] as string | null) ?? null, isPublic: (data['IsPublic'] as boolean) ?? false, createdAt: data['CreatedAt'] as string, vocabularyCount: 0 };
      })
    );
  }

  deleteFolder(id: number): Observable<void> {
    return from(supabase.from('VocabularyFolders').delete().eq('Id', id)).pipe(map(({ error }) => { if (error) throw error; }));
  }

  getVocabularies(query: VocabularyListQuery = {}): Observable<PagedResult<VocabularyDto>> { return from(this.fetchVocabularies(query)); }

  getById(id: number): Observable<VocabularyDto> {
    return from(supabase.from('Vocabularies').select('Id, FolderId, LanguageId, Word, Pronunciation, Meaning, SpecificData, CreatedAt, VocabularyFolders:FolderId(FolderName), Languages:LanguageId(LanguageCode), KanjiComponents:KanjiComponents(order, Kanji:KanjiId(Id, Character, AmHanViet))').eq('Id', id).single()).pipe(
      map(({ data, error }) => { if (error) throw error; return this.mapVocabularyRow(data); })
    );
  }

  create(dto: CreateVocabularyDto): Observable<VocabularyDto> {
    return from(supabase.from('Vocabularies').insert({ FolderId: dto.folderId, LanguageId: dto.languageId, Word: dto.word, Pronunciation: dto.pronunciation ?? null, Meaning: dto.meaning, SpecificData: dto.specificData ?? null }).select('Id, FolderId, LanguageId, Word, Pronunciation, Meaning, SpecificData, CreatedAt, VocabularyFolders:FolderId(FolderName), Languages:LanguageId(LanguageCode), KanjiComponents:KanjiComponents(order, Kanji:KanjiId(Id, Character, AmHanViet))').single()).pipe(
      map(({ data, error }) => { if (error) throw error; return this.mapVocabularyRow(data); })
    );
  }

  update(id: number, dto: UpdateVocabularyDto): Observable<VocabularyDto> {
    const patch: Record<string, unknown> = {};
    if (dto.word !== undefined) patch['Word'] = dto.word;
    if (dto.pronunciation !== undefined) patch['Pronunciation'] = dto.pronunciation;
    if (dto.meaning !== undefined) patch['Meaning'] = dto.meaning;
    if (dto.specificData !== undefined) patch['SpecificData'] = dto.specificData;
    return from(supabase.from('Vocabularies').update(patch).eq('Id', id).select('Id, FolderId, LanguageId, Word, Pronunciation, Meaning, SpecificData, CreatedAt, VocabularyFolders:FolderId(FolderName), Languages:LanguageId(LanguageCode), KanjiComponents:KanjiComponents(order, Kanji:KanjiId(Id, Character, AmHanViet))').single()).pipe(
      map(({ data, error }) => { if (error) throw error; return this.mapVocabularyRow(data); })
    );
  }

  delete(id: number): Observable<void> {
    return from(supabase.from('Vocabularies').delete().eq('Id', id)).pipe(map(({ error }) => { if (error) throw error; }));
  }

  private async fetchVocabularies(query: VocabularyListQuery): Promise<PagedResult<VocabularyDto>> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const from_ = (page - 1) * pageSize;
    const to = from_ + pageSize - 1;
    let q = supabase.from('Vocabularies').select('Id, FolderId, LanguageId, Word, Pronunciation, Meaning, SpecificData, CreatedAt, VocabularyFolders:FolderId(FolderName), Languages:LanguageId(LanguageCode), KanjiComponents:KanjiComponents(order, Kanji:KanjiId(Id, Character, AmHanViet))', { count: 'exact' });
    if (query.folderId != null) q = q.eq('FolderId', query.folderId);
    if (query.languageId != null) q = q.eq('LanguageId', query.languageId);
    if (query.search) q = q.ilike('Word', `%${query.search}%`);
    const { data, error, count } = await q.range(from_, to).order('CreatedAt', { ascending: false });
    if (error) throw error;
    const totalCount = count ?? 0;
    return { items: (data ?? []).map((r) => this.mapVocabularyRow(r)), totalCount, page, pageSize, totalPages: Math.ceil(totalCount / pageSize) };
  }

  private mapVocabularyRow(r: Record<string, unknown>): VocabularyDto {
    const folder = r['VocabularyFolders'] as { FolderName: string } | null;
    const lang = r['Languages'] as { LanguageCode: string } | null;
    const components = r['KanjiComponents'] as Array<{ order: number; Kanji: { Id: number; Character: string; AmHanViet: string } }> | null;
    return {
      id: r['Id'] as number, folderId: r['FolderId'] as number, folderName: folder?.FolderName ?? '',
      languageId: r['LanguageId'] as number, languageCode: lang?.LanguageCode ?? '',
      word: r['Word'] as string, pronunciation: (r['Pronunciation'] as string | null) ?? null,
      meaning: r['Meaning'] as string, specificData: (r['SpecificData'] as string | null) ?? null,
      createdAt: r['CreatedAt'] as string,
      kanjiComponents: (components ?? []).map((c) => ({ kanjiId: c.Kanji.Id, character: c.Kanji.Character, amHanViet: c.Kanji.AmHanViet, order: c.order }))
    };
  }
}
