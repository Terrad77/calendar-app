export type { AuthPayload, User } from '../../types/auth.types';
export type { UserState } from './user.types';

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
