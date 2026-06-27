import { Injectable } from '@angular/core';
import { from, Observable } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { supabase } from '../supabase/supabase.client';

export interface FolderDto {
  id: number;
  userId: number;
  name: string;
  description: string | null;
  createdAt: string;
  itemCount?: number;
}

export interface CreateFolderDto {
  name: string;
  description?: string | null;
}

export interface UpdateFolderDto {
  name?: string;
  description?: string | null;
}

@Injectable({ providedIn: 'root' })
export class FolderService {
  getFolders(): Observable<FolderDto[]> {
    return from(this.getCurrentUserId()).pipe(
      switchMap((userId) =>
        from(
          supabase
            .from('Folders')
            .select('*')
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
        .from('Folders')
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
            .from('Folders')
            .insert({
              UserId: userId,
              Name: dto.name,
              Description: dto.description ?? null,
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
    if (dto.name !== undefined) patch['Name'] = dto.name;
    if (dto.description !== undefined) patch['Description'] = dto.description;

    return from(
      supabase
        .from('Folders')
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
    return from(supabase.from('Folders').delete().eq('Id', id)).pipe(
      map(({ error }) => {
        if (error) throw error;
      })
    );
  }

  addVocabulary(folderId: number, vocabularyId: number): Observable<void> {
    return from(
      supabase
        .from('FolderItems')
        .insert({ FolderId: folderId, VocabularyId: vocabularyId })
    ).pipe(
      map(({ error }) => {
        if (error) throw error;
      })
    );
  }

  removeVocabulary(folderId: number, vocabularyId: number): Observable<void> {
    return from(
      supabase
        .from('FolderItems')
        .delete()
        .eq('FolderId', folderId)
        .eq('VocabularyId', vocabularyId)
    ).pipe(
      map(({ error }) => {
        if (error) throw error;
      })
    );
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

  private mapRow(r: Record<string, unknown>): FolderDto {
    return {
      id: r['Id'] as number,
      userId: r['UserId'] as number,
      name: r['Name'] as string,
      description: (r['Description'] as string | null) ?? null,
      createdAt: r['CreatedAt'] as string,
      itemCount: (r['ItemCount'] as number | undefined) ?? 0,
    };
  }
}
