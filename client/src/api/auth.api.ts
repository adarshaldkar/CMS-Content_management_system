import { apiClient } from './client';
import type { AuthSession, User } from '../types';

export interface LoginDto {
  email: string;
  password: string;
  cfTurnstileToken?: string;
}

export interface RegisterDto {
  name: string;
  email: string;
  password: string;
  cfTurnstileToken?: string;
  acceptedTermsVersion?: string;
}

export interface UpdateProfileDto {
  name?: string;
  bio?: string;
  avatarUrl?: string;
}

export interface ChangePasswordDto {
  currentPassword: string;
  newPassword: string;
}

export const authApi = {
  async login(dto: LoginDto): Promise<AuthSession> {
    const { data } = await apiClient.post<AuthSession>('/auth/login', dto);
    return data;
  },

  async register(dto: RegisterDto): Promise<AuthSession> {
    const { data } = await apiClient.post<AuthSession>('/auth/register', dto);
    return data;
  },

  async getMe(): Promise<AuthSession> {
    const { data } = await apiClient.get<AuthSession>('/auth/me');
    return data;
  },

  async updateProfile(dto: UpdateProfileDto): Promise<User> {
    const { data } = await apiClient.patch<{ user?: User } | User>('/auth/me', dto);
    return (data as { user?: User }).user || (data as User);
  },

  async changePassword(dto: ChangePasswordDto): Promise<{ message: string }> {
    const { data } = await apiClient.patch<{ message: string }>('/auth/change-password', dto);
    return data;
  },

  async logout(): Promise<{ message: string }> {
    localStorage.removeItem('cms_access_token');
    const { data } = await apiClient.post<{ message: string }>('/auth/logout');
    return data;
  },

  async logoutAll(): Promise<{ message: string }> {
    localStorage.removeItem('cms_access_token');
    const { data } = await apiClient.post<{ message: string }>('/auth/logout-all');
    return data;
  },

  async refresh(): Promise<{ message: string }> {
    const { data } = await apiClient.post<{ message: string }>('/auth/refresh');
    return data;
  },

  async forgotPassword(email: string, cfTurnstileToken?: string): Promise<{ message: string }> {
    const { data } = await apiClient.post<{ message: string }>('/auth/forgot-password', {
      email,
      ...(cfTurnstileToken ? { cfTurnstileToken } : {}),
    });
    return data;
  },

  async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    const { data } = await apiClient.post<{ message: string }>('/auth/reset-password', {
      token,
      newPassword,
    });
    return data;
  },
};
