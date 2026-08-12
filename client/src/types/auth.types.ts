export type UserRole = 'super_admin' | 'admin' | 'editor' | 'author' | 'user';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  isActive: boolean;
  bio?: string | null;
  avatarUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuthSession {
  user: User;
  permissions: string[];
}
