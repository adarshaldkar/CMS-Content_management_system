import { create } from 'zustand';
import type { User, UserRole } from '../types';
import { authApi } from '../api/auth.api';

interface AuthState {
  user: User | null;
  permissions: string[];
  isAuthenticated: boolean;
  isLoading: boolean;
  hasCheckedAuth: boolean;

  setAuthUser: (user: User & { permissions?: string[] }) => void;
  clearAuth: () => void;
  updateUser: (partial: Partial<User>) => void;
  checkAuth: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
  hasRole: (roles: UserRole | UserRole[]) => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  permissions: [],
  isAuthenticated: false,
  isLoading: true,
  hasCheckedAuth: false,

  setAuthUser: (authUser: User & { permissions?: string[] }) => {
    const permissions = authUser.permissions || [];
    set({
      user: authUser,
      permissions,
      isAuthenticated: true,
      isLoading: false,
      hasCheckedAuth: true,
    });
  },

  clearAuth: () =>
    set({
      user: null,
      permissions: [],
      isAuthenticated: false,
      isLoading: false,
      hasCheckedAuth: true,
    }),

  updateUser: (partial: Partial<User>) =>
    set((state) => ({
      user: state.user ? { ...state.user, ...partial } : null,
    })),

  checkAuth: async () => {
    set({ isLoading: true });
    try {
      const { user } = (await authApi.getMe()) as any;
      if (user) {
        set({
          user,
          permissions: user.permissions || [],
          isAuthenticated: true,
          isLoading: false,
          hasCheckedAuth: true,
        });
      } else {
        set({
          user: null,
          permissions: [],
          isAuthenticated: false,
          isLoading: false,
          hasCheckedAuth: true,
        });
      }
    } catch {
      set({
        user: null,
        permissions: [],
        isAuthenticated: false,
        isLoading: false,
        hasCheckedAuth: true,
      });
    }
  },

  hasPermission: (permission: string) => {
    const { permissions, user } = get();
    if (!user) return false;
    if (user.role === 'super_admin' || user.role === 'SUPER_ADMIN' as any) return true;
    return permissions.includes(permission);
  },

  hasRole: (roles: UserRole | UserRole[]) => {
    const { user } = get();
    if (!user) return false;
    if (user.role === 'super_admin' || user.role === 'SUPER_ADMIN' as any) return true;
    const allowed = (Array.isArray(roles) ? roles : [roles]).map((r) => r.toLowerCase());
    return allowed.includes(user.role.toLowerCase());
  },
}));
