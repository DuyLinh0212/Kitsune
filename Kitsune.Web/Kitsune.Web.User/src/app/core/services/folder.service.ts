import { Injectable } from '@angular/core';
import { from, Observable, Subject, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { supabase } from '../supabase/supabase.client';

export interface FolderDto {
  id: number;
  userId: number;
  name: string;
  description: string | null;
  isPublic: boolean;
  createdAt: string;
  vocabCount: number;
}

export interface CreateFolderDto {
  name: string;
  description?: string | null;
  isPublic?: boolean;
}

export interface UpdateFolderDto {
  name?: string;
  description?: string | null;
  isPublic?: boolean;
}

@Injectable({ providedIn: 'root' })
export class FolderService {
  // Emits folderId whenever a vocabulary is added to a folder
  readonly vocabAdded$ = new Subject<number>();

  triggerVocabAdded(folderId: number): void {
    this.vocabAdded$.next(folderId);
  }

  getFolders(): Observable<FolderDto[]> {
    return from(this.getCurrentUserId()).pipe(
      switchMap((userId) =>
        from(
          supabase
            .from('VocabularyFolder')
            .select('*, Vocabularies(count)')
            .eq('UserId', userId)
            .order('CreatedAt', { ascending: false })
        )
      ),
      map(({ data, error }) => {
        if (error) throw error;
        return (data ?? []).map((r: Record<string, unknown>) => this.mapRow(r));
      })
    );
  }

  getById(id: number): Observable<FolderDto> {
    return from(
      supabase
        .from('VocabularyFolder')
        .select('*')
        .eq('Id', id)
        .single()
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return this.mapRow(data);
      })
    );
  }

  create(dto: CreateFolderDto): Observable<FolderDto> {
    return from(this.getCurrentUserId()).pipe(
      switchMap((userId) =>
        from(
          supabase
            .from('VocabularyFolder')
            .insert({
              UserId: userId,
              FolderName: dto.name,
              Description: dto.description ?? null,
              IsPublic: dto.isPublic ?? false,
            })
            .select('*')
            .single()
        )
      ),
      map(({ data, error }) => {
        if (error) throw error;
        return this.mapRow(data);
      })
    );
  }

  update(id: number, dto: UpdateFolderDto): Observable<FolderDto> {
    const patch: Record<string, unknown> = {};
    if (dto.name !== undefined) patch['FolderName'] = dto.name;
    if (dto.description !== undefined) patch['Description'] = dto.description;
    if (dto.isPublic !== undefined) patch['IsPublic'] = dto.isPublic;

    return from(
      supabase
        .from('VocabularyFolder')
        .update(patch)
        .eq('Id', id)
        .select('*')
        .single()
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return this.mapRow(data);
      })
    );
  }

  delete(id: number): Observable<void> {
    return from(supabase.from('VocabularyFolder').delete().eq('Id', id)).pipe(
      map(({ error }) => {
        if (error) throw error;
      })
    );
  }

  // Chuyển từ vựng sang folder (cập nhật FolderId của Vocabularies)
  addVocabulary(folderId: number, vocabularyId: number): Observable<void> {
    return from(
      supabase
        .from('Vocabularies')
        .update({ FolderId: folderId })
        .eq('Id', vocabularyId)
        .select('Id')
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        if (!data || (data as { Id: number }[]).length === 0) {
          throw new Error('Từ vựng này không thuộc về bạn hoặc không tìm thấy');
        }
      })
    );
  }

  // Thêm từ vựng (copy) vào folder cho vocabulary toàn cầu
  addVocabularyCopy(
    folderId: number, 
    word: string, 
    pronunciation: string | null, 
    meaning: string, 
    languageId: number,
    kanjiId?: number
  ): Observable<void> {
    return from(
      supabase
        .from('Vocabularies')
        .insert({
          FolderId: folderId,
          LanguageId: languageId || 1,
          Word: word,
          Pronunciation: pronunciation ?? null,
          Meaning: meaning,
        })
        .select('Id')
        .single()
    ).pipe(
      switchMap(({ data, error }) => {
        if (error) throw error;
        if (!data) throw new Error('Không lấy được ID từ vựng mới tạo');
        
        if (kanjiId) {
          return from(
            supabase.from('KanjiComponents').insert({
              VocabularyId: data.Id,
              KanjiId: kanjiId,
              Order: 0
            })
          ).pipe(
            map(({ error: kError }) => {
              if (kError) throw kError;
            })
          );
        }
        return of(void 0);
      })
    );
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

  private mapRow(r: Record<string, unknown>): FolderDto {
    const vocabArr = r['Vocabularies'] as Array<{ count: number }> | null;
    const vocabCount =
      Array.isArray(vocabArr) && vocabArr.length > 0 ? (vocabArr[0].count ?? 0) : 0;
    return {
      id: r['Id'] as number,
      userId: r['UserId'] as number,
      name: r['FolderName'] as string,
      description: (r['Description'] as string | null) ?? null,
      isPublic: (r['IsPublic'] as boolean) ?? false,
      createdAt: r['CreatedAt'] as string,
      vocabCount,
    };
  }
}
