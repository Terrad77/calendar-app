export interface User {
  id: string;
  name: string;
  email: string;
  avatarURL?: string;
  theme?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthResponse {
  user: User;
  token: string;
  refreshToken: string;
}

export interface UserInfo {
  email: string;
  password: string;
}

export interface RegisterInfo extends UserInfo {
  name?: string;
}

export interface UserData {
  name?: string;
  theme?: string;
}

export interface AxiosError {
  response?: {
    data?: {
      message?: string;
      error?: string;
    };
    status?: number;
  };
  message?: string;
}
