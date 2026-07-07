import { Injectable } from '@angular/core';
import { AuthChangeEvent, Session, User } from '@supabase/supabase-js';
import { BehaviorSubject, from, Observable, of, throwError } from 'rxjs';
import { map, switchMap, tap } from 'rxjs/operators';

import { supabase } from '../supabase/supabase.client';
import {
  AuthResponse, ForgotPasswordRequest, ForgotPasswordResponse,
  LoginRequest, RegisterRequest, UserProfile
} from '../models/auth.model';

export type AppUser = UserProfile;

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly _currentUser$ = new BehaviorSubject<UserProfile | null>(null);
  readonly currentUser$ = this._currentUser$.asObservable();

  constructor() {
    void supabase.auth.getSession().then(({ data }: { data: { session: Session | null } }) => {
      const user = data.session?.user ?? null;
      if (user) void this.fetchAndEmitProfile(user);
    });

    supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
      const user = session?.user ?? null;
      if (user) {
        void this.fetchAndEmitProfile(user);
      } else {
        this._currentUser$.next(null);
      }
    });
  }

  login(payload: LoginRequest): Observable<AuthResponse> {
    const email$ = payload.login.includes('@')
      ? of(payload.login)
      : from(
          supabase.from('Users').select('Email').eq('Username', payload.login).maybeSingle()
        ).pipe(
          map(({ data, error }) => {
            if (error || !data) throw new Error('Tên đăng nhập không tồn tại');
            return (data as { Email: string }).Email;
          })
        );

    return email$.pipe(
      switchMap((email) =>
        from(supabase.auth.signInWithPassword({ email, password: payload.password }))
      ),
      switchMap(({ data, error }) => {
        if (error) return throwError(() => error);
        return from(this.buildAuthResponse(data.session!.access_token, data.session!.expires_at ?? 0, data.user!));
      }),
      tap((response) => this._currentUser$.next(response.user))
    );
  }

  register(payload: RegisterRequest): Observable<AuthResponse> {
    return from(
      supabase.auth.signUp({
        email: payload.email,
        password: payload.password,
        options: {
          data: {
            username: payload.username,
            full_name: payload.fullName ?? null
          }
        }
      })
    ).pipe(
      switchMap(({ data, error }) => {
        if (error) return throwError(() => error);
        return from(this.buildAuthResponse(data.session?.access_token ?? '', data.session?.expires_at ?? 0, data.user!));
      }),
      tap((response) => this._currentUser$.next(response.user))
    );
  }

  forgotPassword(payload: ForgotPasswordRequest): Observable<ForgotPasswordResponse> {
    return from(
      supabase.auth.resetPasswordForEmail(payload.email, {
        redirectTo: `${window.location.origin}/reset-password`
      })
    ).pipe(
      map(({ error }) => {
        if (error) throw error;
        return { message: 'Email đặt lại mật khẩu đã được gửi. Vui lòng kiểm tra hộp thư.' };
      })
    );
  }

  logout(): Observable<void> {
    return from(supabase.auth.signOut()).pipe(
      map(({ error }) => {
        if (error) throw error;
        this._currentUser$.next(null);
      })
    );
  }

  getStoredUser(): UserProfile | null {
    return this._currentUser$.getValue();
  }

  getToken(): string | null {
    return (supabase.auth as any)['_session']?.access_token ?? null;
  }

  hasValidSession(): boolean {
    return this._currentUser$.getValue() !== null;
  }

  isAdmin(): boolean {
    return this._currentUser$.getValue()?.roles.includes('ADMIN') ?? false;
  }

  updateProfile(patch: { fullName?: string | null; username?: string }): Observable<UserProfile> {
    return from(this.getCurrentUserId()).pipe(
      switchMap((userId) => {
        const update: Record<string, unknown> = {};
        if (patch.fullName !== undefined) update['FullName'] = patch.fullName;
        if (patch.username !== undefined) update['Username'] = patch.username;
        return from(
          supabase.from('Users').update(update).eq('Id', userId)
            .select('Id, Username, Email, FullName, AvatarUrl, IsVerified, User_Role(Role(RoleName))')
            .single()
        );
      }),
      map(({ data, error }) => {
        if (error) throw error;
        const profile = this.mapProfileRow(data as Record<string, unknown>);
        this._currentUser$.next(profile);
        return profile;
      })
    );
  }

  private async buildAuthResponse(accessToken: string, expiresAt: number, supaUser: User): Promise<AuthResponse> {
    const profile = (await this.fetchProfile(supaUser)) ?? this.mapUser(supaUser);
    this._currentUser$.next(profile);
    return {
      accessToken,
      expiresAtUtc: new Date(expiresAt * 1000).toISOString(),
      user: profile
    };
  }

  private async fetchAndEmitProfile(supaUser: User): Promise<void> {
    const profile = (await this.fetchProfile(supaUser)) ?? this.mapUser(supaUser);
    this._currentUser$.next(profile);
  }

  private async fetchProfile(supaUser: User): Promise<UserProfile | null> {
    const email = supaUser.email;
    if (!email) return null;

    const { data, error } = await supabase
      .from('Users')
      .select('Id, Username, Email, FullName, AvatarUrl, IsVerified, User_Role(Role(RoleName))')
      .eq('Email', email)
      .maybeSingle();

    if (error) {
      console.warn('[AuthService] Error fetching profile by email:', error.message);
      return null;
    }

    if (data) return this.mapProfileRow(data as Record<string, unknown>);

    return await this.createUserProfile(supaUser);
  }

  private async createUserProfile(supaUser: User): Promise<UserProfile | null> {
    const email = supaUser.email ?? '';
    const meta = supaUser.user_metadata ?? {};

    const base = (meta['username'] as string | undefined)
      ?? email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '_').slice(0, 40);
    const username = (base + '_' + Date.now().toString().slice(-4)).slice(0, 50);

    const { data: created, error: ce } = await supabase
      .from('Users')
      .insert({
        Username: username,
        PasswordHash: 'SUPABASE_AUTH',
        Email: email,
        FullName: (meta['full_name'] as string | undefined) ?? null,
        IsActive: true,
        IsVerified: supaUser.email_confirmed_at != null,
      })
      .select('Id, Username, Email, FullName, AvatarUrl, IsVerified, User_Role(Role(RoleName))')
      .single();

    if (ce || !created) {
      const { data: existing } = await supabase
        .from('Users')
        .select('Id, Username, Email, FullName, AvatarUrl, IsVerified, User_Role(Role(RoleName))')
        .eq('Email', email)
        .maybeSingle();
      if (existing) return this.mapProfileRow(existing as Record<string, unknown>);
      console.warn('[AuthService] Could not auto-create user profile:', ce?.message);
      return null;
    }

    const { data: roleData } = await supabase
      .from('Role')
      .select('Id')
      .eq('RoleName', 'USER')
      .maybeSingle();

    if (roleData) {
      await supabase.from('User_Role').insert({
        UserId: (created as Record<string, unknown>)['Id'],
        RoleId: (roleData as Record<string, unknown>)['Id'],
      });
    }

    return this.mapProfileRow(created as Record<string, unknown>);
  }

  private mapProfileRow(data: Record<string, unknown>): UserProfile {
    const userRoles = data['User_Role'] as unknown as Array<{ Role: { RoleName: string } }> | null;
    return {
      id: data['Id'] as number,
      username: data['Username'] as string,
      email: data['Email'] as string,
      fullName: (data['FullName'] as string | null) ?? null,
      avatarUrl: (data['AvatarUrl'] as string | null) ?? null,
      isVerified: (data['IsVerified'] as boolean) ?? false,
      createdAt: (data['CreatedAt'] as string | null) ?? null,
      roles: userRoles
        ? userRoles.map((r) => r.Role?.RoleName?.toUpperCase() ?? '').filter(Boolean)
        : []
    };
  }

  private mapUser(user: User): UserProfile {
    const meta = user.user_metadata ?? {};
    return {
      id: 0,
      username: (meta['username'] as string | undefined) ?? user.email ?? '',
      email: user.email ?? '',
      fullName: (meta['full_name'] as string | undefined) ?? null,
      avatarUrl: (meta['avatar_url'] as string | undefined) ?? null,
      isVerified: user.email_confirmed_at != null,
      createdAt: user.created_at ?? null,
      roles: (meta['roles'] as string[] | undefined) ?? []
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
    if (!profile) throw new Error('User profile not found');
    return (profile as { Id: number }).Id;
  }
}
