export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserCredentials {
  email: string;
  password: string;
}

export interface RegisterData extends UserCredentials {
  name: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface TokenPayload {
  userId: string;
  email: string;
  iat?: number;
  exp?: number;
}

export interface AuthResponse {
  user: Omit<User, "password">;
  tokens: AuthTokens;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}
