import { Injectable } from '@angular/core';
import { from, Observable } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { supabase } from '../supabase/supabase.client';

// ✅ Matches actual schema: Users(Id, Username, Email, FullName, AvatarUrl, IsVerified, IsActive, CreatedAt)
// Roles come from User_Role join → Roles table
export interface AdminUserDto {
  id: number;
  username: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  isVerified: boolean;
  isActive: boolean;
  roles: string[];
  createdAt: string;
}

export interface UpdateUserRolesDto {
  roles: string[];
}

export interface CreateUserDto {
  username: string;
  email: string;
  password: string;
  fullName?: string | null;
}

export interface UpdateUserDto {
  username?: string | null;
  email?: string | null;
  fullName?: string | null;
  isVerified?: boolean;
  isActive?: boolean;
}

@Injectable({ providedIn: 'root' })
export class AdminUserService {

  getUsers(query: { search?: string; role?: string } = {}): Observable<AdminUserDto[]> {
    let q = supabase
      .from('Users')
      .select(`
        Id, Username, Email, FullName, AvatarUrl, IsVerified, IsActive, CreatedAt,
        User_Role(RoleId, Roles(RoleName))
      `)
      .order('CreatedAt', { ascending: false });

    if (query.search) {
      q = q.or(`Username.ilike.%${query.search}%,Email.ilike.%${query.search}%,FullName.ilike.%${query.search}%`);
    }

    return from(q).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        let result = (data ?? []).map((r) => this.mapUserRow(r));
        if (query.role && query.role !== 'ALL') {
          result = result.filter((u) => u.roles.includes(query.role!));
        }
        return result;
      })
    );
  }

  getUserById(id: number): Observable<AdminUserDto> {
    return from(
      supabase
        .from('Users')
        .select(`
          Id, Username, Email, FullName, AvatarUrl, IsVerified, IsActive, CreatedAt,
          User_Role(RoleId, Roles(RoleName))
        `)
        .eq('Id', id)
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
        .select(`
          Id, Username, Email, FullName, AvatarUrl, IsVerified, IsActive, CreatedAt,
          User_Role(RoleId, Roles(RoleName))
        `)
        .single()
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return this.mapUserRow(data);
      })
    );
  }

  createUser(dto: CreateUserDto): Observable<AdminUserDto> {
    return from(
      supabase.auth.signUp({
        email: dto.email,
        password: dto.password,
        options: { data: { username: dto.username, full_name: dto.fullName ?? null } }
      })
    ).pipe(
      switchMap(({ data, error }) => {
        if (error) throw error;
        const authUserId = data.user?.id;
        if (!authUserId) throw new Error('Không thể tạo tài khoản xác thực.');
        // Note: The database likely handles creating the public.Users record via a trigger on auth.users insert.
        // We will query the newly created user record.
        return from(
          supabase
            .from('Users')
            .select(`
              Id, Username, Email, FullName, AvatarUrl, IsVerified, IsActive, CreatedAt,
              User_Role(RoleId, Roles(RoleName))
            `)
            .eq('Email', dto.email)
            .single()
        );
      }),
      map(({ data, error }) => {
        if (error) throw error;
        return this.mapUserRow(data);
      })
    );
  }

  updateActive(id: number, isActive: boolean): Observable<AdminUserDto> {
    return from(
      supabase
        .from('Users')
        .update({ IsActive: isActive })
        .eq('Id', id)
        .select(`
          Id, Username, Email, FullName, AvatarUrl, IsVerified, IsActive, CreatedAt,
          User_Role(RoleId, Roles(RoleName))
        `)
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
      map(({ error }) => { if (error) throw error; })
    );
  }

  updateUser(id: number, dto: UpdateUserDto): Observable<AdminUserDto> {
    const patch: Record<string, unknown> = {};
    if (dto.username !== undefined) patch['Username'] = dto.username;
    if (dto.email !== undefined) patch['Email'] = dto.email;
    if (dto.fullName !== undefined) patch['FullName'] = dto.fullName;
    if (dto.isVerified !== undefined) patch['IsVerified'] = dto.isVerified;
    if (dto.isActive !== undefined) patch['IsActive'] = dto.isActive;

    return from(
      supabase
        .from('Users')
        .update(patch)
        .eq('Id', id)
        .select(`
          Id, Username, Email, FullName, AvatarUrl, IsVerified, IsActive, CreatedAt,
          User_Role(RoleId, Roles(RoleName))
        `)
        .single()
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return this.mapUserRow(data);
      })
    );
  }

  // Assign roles: delete existing User_Role rows and insert new ones
  updateRoles(userId: number, roleNames: string[]): Observable<void> {
    return from(this.doUpdateRoles(userId, roleNames));
  }

  private async doUpdateRoles(userId: number, roleNames: string[]): Promise<void> {
    // 1. Get role IDs
    const { data: rolesData, error: re } = await supabase
      .from('Roles')
      .select('Id, RoleName')
      .in('RoleName', roleNames);
    if (re) throw re;

    const roleIds = (rolesData ?? []).map((r) => (r as { Id: number }).Id);

    // 2. Delete old User_Role entries
    await supabase.from('User_Role').delete().eq('UserId', userId);

    // 3. Insert new
    if (roleIds.length > 0) {
      const rows = roleIds.map((rid) => ({ UserId: userId, RoleId: rid }));
      const { error: ie } = await supabase.from('User_Role').insert(rows);
      if (ie) throw ie;
    }
  }

  // Get recent quiz activity for a user (as proxy for activity logs)
  getActivityLogs(userId: number, limit = 20): Observable<{ action: string; description: string | null; timestamp: string }[]> {
    return from(
      supabase
        .from('QuizAttempts')
        .select('Id, AccuracyPercentage, CreatedAt, Quizzes:QuizId(Title)')
        .eq('UserId', userId)
        .order('CreatedAt', { ascending: false })
        .limit(limit)
    ).pipe(
      map(({ data, error }) => {
        if (error) return [];
        return (data ?? []).map((r) => {
          const quiz = r['Quizzes'] as unknown as { Title: string } | null;
          return {
            action: 'QUIZ_ATTEMPT',
            description: `Quiz "${quiz?.Title ?? '?'}" — ${Math.round((r['AccuracyPercentage'] as number) ?? 0)}% chính xác`,
            timestamp: r['CreatedAt'] as string
          };
        });
      })
    );
  }

  private mapUserRow(r: Record<string, unknown>): AdminUserDto {
    // Roles come from User_Role junction → Roles relation
    const userRoles = r['User_Role'] as Array<{ Roles: { RoleName: string } | null }> | null;
    const roles = (userRoles ?? [])
      .map((ur) => ur.Roles?.RoleName)
      .filter((rn): rn is string => !!rn);

    return {
      id: r['Id'] as number,
      username: r['Username'] as string,
      email: r['Email'] as string,
      fullName: (r['FullName'] as string | null) ?? null,
      avatarUrl: (r['AvatarUrl'] as string | null) ?? null,
      isVerified: (r['IsVerified'] as boolean) ?? false,
      isActive: (r['IsActive'] as boolean) ?? true,
      roles,
      createdAt: r['CreatedAt'] as string
    };
  }
}
