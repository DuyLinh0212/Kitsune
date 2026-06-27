import { Injectable } from '@angular/core';
import { from, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { supabase } from '../supabase/supabase.client';

export interface AdminUserDto {
  id: number;
  authUserId: string;
  username: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  isVerified: boolean;
  roles: string[];
  learningLanguage: string;
  totalScore: number;
  createdAt: string;
}

export interface UpdateUserRolesDto {
  roles: string[];
}

export interface UpdateUserStatusDto {
  isVerified: boolean;
}

@Injectable({ providedIn: 'root' })
export class AdminUserService {
  getUsers(query: { search?: string; role?: string } = {}): Observable<AdminUserDto[]> {
    let q = supabase
      .from('Users')
      .select('Id, AuthUserId, Username, Email, FullName, AvatarUrl, IsVerified, Roles, LearningLanguage, TotalScore, CreatedAt')
      .order('CreatedAt', { ascending: false });

    if (query.search) {
      q = q.or(`Username.ilike.%${query.search}%,Email.ilike.%${query.search}%,FullName.ilike.%${query.search}%`);
    }
    if (query.role) {
      q = q.contains('Roles', [query.role]);
    }

    return from(q).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return (data ?? []).map((r) => this.mapUserRow(r));
      })
    );
  }

  getUserById(id: number): Observable<AdminUserDto> {
    return from(
      supabase
        .from('Users')
        .select('Id, AuthUserId, Username, Email, FullName, AvatarUrl, IsVerified, Roles, LearningLanguage, TotalScore, CreatedAt')
        .eq('Id', id)
        .single()
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return this.mapUserRow(data);
      })
    );
  }

  updateRoles(id: number, dto: UpdateUserRolesDto): Observable<AdminUserDto> {
    return from(
      supabase
        .from('Users')
        .update({ Roles: dto.roles })
        .eq('Id', id)
        .select('Id, AuthUserId, Username, Email, FullName, AvatarUrl, IsVerified, Roles, LearningLanguage, TotalScore, CreatedAt')
        .single()
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return this.mapUserRow(data);
      })
    );
  }

  updateVerification(id: number, isVerified: boolean): Observable<AdminUserDto> {
    return from(
      supabase
        .from('Users')
        .update({ IsVerified: isVerified })
        .eq('Id', id)
        .select('Id, AuthUserId, Username, Email, FullName, AvatarUrl, IsVerified, Roles, LearningLanguage, TotalScore, CreatedAt')
        .single()
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return this.mapUserRow(data);
      })
    );
  }

  deleteUser(id: number): Observable<void> {
    return from(supabase.from('Users').delete().eq('Id', id)).pipe(
      map(({ error }) => {
        if (error) throw error;
      })
    );
  }

  getActivityLogs(limit = 50): Observable<{ id: number; userId: number; username: string; action: string; description: string | null; timestamp: string }[]> {
    return from(
      supabase
        .from('UserActivityLogs')
        .select('Id, UserId, Action, Description, Timestamp, Users:UserId(Username)')
        .order('Timestamp', { ascending: false })
        .limit(limit)
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return (data ?? []).map((r) => {
          const user = r['Users'] as { Username: string } | null;
          return {
            id: r['Id'] as number,
            userId: r['UserId'] as number,
            username: user?.Username ?? 'system',
            action: r['Action'] as string,
            description: (r['Description'] as string | null) ?? null,
            timestamp: r['Timestamp'] as string
          };
        });
      })
    );
  }

  private mapUserRow(r: Record<string, unknown>): AdminUserDto {
    return {
      id: r['Id'] as number,
      authUserId: r['AuthUserId'] as string,
      username: r['Username'] as string,
      email: r['Email'] as string,
      fullName: (r['FullName'] as string | null) ?? null,
      avatarUrl: (r['AvatarUrl'] as string | null) ?? null,
      isVerified: (r['IsVerified'] as boolean) ?? false,
      roles: (r['Roles'] as string[]) ?? [],
      learningLanguage: r['LearningLanguage'] as string,
      totalScore: r['TotalScore'] as number,
      createdAt: r['CreatedAt'] as string
    };
  }
}
