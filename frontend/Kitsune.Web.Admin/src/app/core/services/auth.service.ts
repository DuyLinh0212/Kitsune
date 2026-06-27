import { Injectable } from '@angular/core';
import { AuthError, Session, User } from '@supabase/supabase-js';
import { BehaviorSubject, from, Observable, throwError } from 'rxjs';
import { map, switchMap, tap } from 'rxjs/operators';
import { supabase } from '../supabase/supabase.client';
import { AuthResponse, ForgotPasswordRequest, ForgotPasswordResponse, LoginRequest, RegisterRequest, UserProfile } from '../models/auth.model';

export type AppUser = UserProfile;

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly _currentUser$ = new BehaviorSubject<AppUser | null>(null);
  readonly currentUser$ = this._currentUser$.asObservable();

  constructor() {
    void supabase.auth.getSession().then(({ data }) => {
      const user = data.session?.user ?? null;
      this._currentUser$.next(user ? this.mapUser(user) : null);
    });
    supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user ?? null;
      this._currentUser$.next(user ? this.mapUser(user) : null);
    });
  }

  login(payload: LoginRequest): Observable<AuthResponse> {
    return from(
      supabase.auth.signInWithPassword({ email: payload.login, password: payload.password })
    ).pipe(
      switchMap(({ data, error }) => {
        if (error) return throwError(() => error);
        return from(this.buildAuthResponse(data.session!, data.user!));
      }),
      tap((response) => this._currentUser$.next(response.user))
    );
  }

  register(payload: RegisterRequest): Observable<AuthResponse> {
    return from(
      supabase.auth.signUp({
        email: payload.email,
        password: payload.password,
        options: { data: { username: payload.username, full_name: payload.fullName ?? null } }
      })
    ).pipe(
      switchMap(({ data, error }) => {
        if (error) return throwError(() => error);
        return from(this.buildAuthResponse(data.session!, data.user!));
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

  getStoredUser(): AppUser | null {
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

  private async buildAuthResponse(session: Session, supaUser: User): Promise<AuthResponse> {
    const profile = await this.fetchProfile(supaUser.id);
    const userProfile = profile ?? this.mapUser(supaUser);
    return {
      accessToken: session.access_token,
      expiresAtUtc: new Date((session.expires_at ?? 0) * 1000).toISOString(),
      user: userProfile
    };
  }

  private async fetchProfile(userId: string): Promise<UserProfile | null> {
    const { data } = await supabase
      .from('Users')
      .select('Id, Username, Email, FullName, AvatarUrl, IsVerified, User_Role(RoleName)')
      .eq('AuthUserId', userId)
      .maybeSingle();
    if (!data) return null;
    const roles = Array.isArray(data['User_Role'])
      ? (data['User_Role'] as Array<{ RoleName: string }>).map((r) => r.RoleName.toUpperCase())
      : [];
    return {
      id: data['Id'] as number,
      username: data['Username'] as string,
      email: data['Email'] as string,
      fullName: (data['FullName'] as string | null) ?? null,
      avatarUrl: (data['AvatarUrl'] as string | null) ?? null,
      isVerified: (data['IsVerified'] as boolean) ?? false,
      roles
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
      roles: (meta['roles'] as string[] | undefined) ?? []
    };
  }
}
