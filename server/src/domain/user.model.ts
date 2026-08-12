import type { PaginationQuery } from './common.model';
import type { Permission } from './permissions.model';

export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  EDITOR = 'EDITOR',
  AUTHOR = 'AUTHOR',
  USER = 'USER',
}

export interface User {
  id: string;
  email: string;
  name: string;
  passwordHash?: string;
  bio: string | null;
  avatarUrl: string | null;
  preferredTopics?: string[] | null;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface CreateUserDto {
  email: string;
  name: string;
  passwordHash: string;
  bio?: string | null;
  avatarUrl?: string | null;
  preferredTopics?: string[] | null;
  role?: UserRole;
  isActive?: boolean;
}

export interface UpdateUserDto {
  email?: string;
  name?: string;
  passwordHash?: string;
  bio?: string | null;
  avatarUrl?: string | null;
  preferredTopics?: string[] | null;
  role?: UserRole;
  isActive?: boolean;
}

export interface UserQueryFilters extends PaginationQuery {
  role?: UserRole;
  isActive?: boolean;
  search?: string;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  bio?: string | null;
  avatarUrl?: string | null;
  preferredTopics?: string[] | null;
  role: UserRole;
  permissions: Permission[];
  isActive: boolean;
}

export interface JwtAccessPayload {
  sub: string;
  email: string;
  name: string;
  role: UserRole;
  jti: string;
  type: 'access';
  iss: string;
  aud: string;
  iat?: number;
  exp?: number;
}

export interface JwtRefreshPayload {
  sub: string;
  jti: string; // sessionId
  familyId: string;
  type: 'refresh';
  iss: string;
  aud: string;
  iat?: number;
  exp?: number;
}
