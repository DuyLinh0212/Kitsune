import { Injectable } from '@angular/core';
import { AuthChangeEvent, Session, User } from '@supabase/supabase-js';
import { BehaviorSubject, from, Observable, throwError } from 'rxjs';
import { map, switchMap, tap } from 'rxjs/operators';

import { supabase } from '../supabase/supabase.client';
import {
	AuthResponse,
	ForgotPasswordRequest,
	ForgotPasswordResponse,
	LoginRequest,
	RegisterRequest,
	UserProfile
} from '../models/auth.model';

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
		return from(
			supabase.auth.signInWithPassword({ email: payload.login, password: payload.password })
		).pipe(
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

	updateProfile(patch: { fullName?: string | null; username?: string }): Observable<UserProfile> {
		return from(this.getCurrentUserId()).pipe(
			switchMap((userId) => {
				const update: Record<string, unknown> = {};
				if (patch.fullName !== undefined) update['FullName'] = patch.fullName;
				if (patch.username !== undefined) update['Username'] = patch.username;
				return from(
					supabase.from('Users').update(update).eq('Id', userId).select('Id, Username, Email, FullName, AvatarUrl, IsVerified, User_Role(RoleName)').single()
				);
			}),
			map(({ data, error }) => {
				if (error) throw error;
				const userRoles = data['User_Role'] as unknown as Array<{ RoleName: string }> | null;
				const profile: UserProfile = {
					id: data['Id'] as number,
					username: data['Username'] as string,
					email: data['Email'] as string,
					fullName: (data['FullName'] as string | null) ?? null,
					avatarUrl: (data['AvatarUrl'] as string | null) ?? null,
					isVerified: (data['IsVerified'] as boolean) ?? false,
					roles: userRoles ? userRoles.map((r) => r.RoleName.toUpperCase()) : []
				};
				this._currentUser$.next(profile);
				return profile;
			})
		);
	}

	// ── Private helpers ──────────────────────────────────────────────────────

	private async buildAuthResponse(accessToken: string, expiresAt: number, supaUser: User): Promise<AuthResponse> {
		const profile = (await this.fetchProfile(supaUser.id)) ?? this.mapUser(supaUser);
		this._currentUser$.next(profile);
		return {
			accessToken,
			expiresAtUtc: new Date(expiresAt * 1000).toISOString(),
			user: profile
		};
	}

	private async fetchAndEmitProfile(supaUser: User): Promise<void> {
		const profile = (await this.fetchProfile(supaUser.id)) ?? this.mapUser(supaUser);
		this._currentUser$.next(profile);
	}

	private async fetchProfile(userId: string): Promise<UserProfile | null> {
		const { data } = await supabase
			.from('Users')
			.select('Id, Username, Email, FullName, AvatarUrl, IsVerified, User_Role(RoleName)')
			.eq('AuthUserId', userId)
			.maybeSingle();

		if (!data) return null;

		const userRoles = data['User_Role'] as unknown as Array<{ RoleName: string }> | null;

		return {
			id: data['Id'] as number,
			username: data['Username'] as string,
			email: data['Email'] as string,
			fullName: (data['FullName'] as string | null) ?? null,
			avatarUrl: (data['AvatarUrl'] as string | null) ?? null,
			isVerified: (data['IsVerified'] as boolean) ?? false,
			roles: userRoles ? userRoles.map((r) => r.RoleName.toUpperCase()) : []
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

	private async getCurrentUserId(): Promise<number> {
		const { data, error } = await supabase.auth.getUser();
		if (error || !data.user) throw new Error('Not authenticated');
		const { data: profile } = await supabase.from('Users').select('Id').eq('AuthUserId', data.user.id).single();
		if (!profile) throw new Error('User profile not found');
		return profile['Id'] as number;
	}
}

