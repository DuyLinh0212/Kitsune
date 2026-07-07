export interface UserProfile {
  id: number;
  username: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  isVerified: boolean;
  roles: string[];
  createdAt: string | null;
}

export interface AuthResponse {
  accessToken: string;
  expiresAtUtc: string;
  user: UserProfile;
}

export interface LoginRequest {
  login: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  fullName?: string | null;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ForgotPasswordResponse {
  message: string;
}
