import type { ReactNode } from 'react';

export interface User {
  id: string;
  name: string;
  email: string;
  avatarURL?: string;
  theme?: string;
  language?: string;
  preferredCountry?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthPayload {
  user: User;
  token: string;
  refreshToken: string;
}

export interface SignInFormData {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface SignUpFormData {
  email: string;
  password: string;
  repeatPassword: string;
  firstName?: string;
  lastName?: string;
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
  };
  token: string;
  expiresIn: number;
}

export interface RegisterError {
  message: string;
  statusCode?: number;
  field?: 'email' | 'password' | 'repeatPassword' | 'general';
}

export interface ModalProps {
  children: ReactNode;
  isOpen: boolean;
  onClose: () => void;
  btnClassName?: string;
  title?: string;
  size?: 'small' | 'medium' | 'large';
  showCloseButton?: boolean;
  showLogo?: boolean;
  overlayClassName?: string;
  closeOnOverlayClick?: boolean;
}
