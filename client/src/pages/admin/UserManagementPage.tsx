import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  CheckCircle2,
  Lock,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  UserX,
  Users,
} from 'lucide-react';
import { apiClient } from '../../api/client';
import { useAuthStore } from '../../stores/authStore';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import type { PaginatedResult, User, UserRole } from '../../types';

export const UserManagementPage: React.FC = () => {
  const { user: currentActor } = useAuthStore();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [newRole, setNewRole] = useState<UserRole>('USER' as any);
  const [showRoleModal, setShowRoleModal] = useState(false);

  // 1. Fetch Users List
  const { data: usersData, isLoading } = useQuery({
    queryKey: ['adminUsersList', searchTerm, roleFilter],
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResult<User>>('/users', {
        params: {
          search: searchTerm || undefined,
          role: roleFilter !== 'all' ? roleFilter : undefined,
          limit: 50,
        },
      });
      return data;
    },
  });

  // 2. Update Role Mutation
  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: UserRole }) => {
      const { data } = await apiClient.patch<User>(`/users/${userId}/role`, { role });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminUsersList'] });
      setShowRoleModal(false);
      setSelectedUser(null);
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Failed to update user role.');
    },
  });

  // 3. Update Status Mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ userId, isActive }: { userId: string; isActive: boolean }) => {
      const { data } = await apiClient.patch<User>(`/users/${userId}/status`, { isActive });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminUsersList'] });
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Failed to update user status.');
    },
  });

  const users = usersData?.items || [];
  const isSuperAdmin = currentActor?.role === 'SUPER_ADMIN';

  const roleBadges: Record<string, { bg: string; text: string; border: string }> = {
    SUPER_ADMIN: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
    ADMIN: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
    EDITOR: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
    AUTHOR: { bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-200' },
    USER: { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200' },
  };

  return (
    <div className="space-y-8 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-subtle pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-accent-crimson font-semibold mb-1">
            <Users size={15} />
            <span>Identity Governance</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-editorial font-bold text-ink-primary">
            User Directory & Access Control
          </h1>
          <p className="text-xs text-ink-secondary mt-1">
            Manage user roles, enforce privilege boundaries, and govern account activation states.
          </p>
        </div>

        {/* Search & Filters */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <input
              type="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name or email..."
              className="w-56 sm:w-64 pl-9 pr-3 py-2 text-xs bg-white border border-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-crimson/20"
            />
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-secondary" />
          </div>

          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-2 text-xs bg-white border border-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-crimson/20 font-medium text-ink-primary"
          >
            <option value="all">All Roles</option>
            <option value="SUPER_ADMIN">Super Admin</option>
            <option value="ADMIN">Admin</option>
            <option value="EDITOR">Editor</option>
            <option value="AUTHOR">Author</option>
            <option value="USER">User / Reader</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      {isLoading ? (
        <div className="py-20 text-center">
          <LoadingSpinner label="Loading user directory..." />
        </div>
      ) : users.length > 0 ? (
        <div className="bg-white border border-border-subtle rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-border-subtle font-mono uppercase text-[11px] text-ink-secondary">
                <tr>
                  <th className="px-6 py-3.5 font-semibold">User</th>
                  <th className="px-6 py-3.5 font-semibold">Role</th>
                  <th className="px-6 py-3.5 font-semibold">Status</th>
                  <th className="px-6 py-3.5 font-semibold">Topics</th>
                  <th className="px-6 py-3.5 font-semibold">Joined Date</th>
                  <th className="px-6 py-3.5 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {users.map((u) => {
                  const badge = roleBadges[u.role] || roleBadges.USER;
                  const isSelf = u.id === currentActor?.id;
                  const isTargetSuperAdmin = u.role === 'SUPER_ADMIN';
                  const canModifyRole = isSuperAdmin || (!isTargetSuperAdmin && !isSelf);

                  return (
                    <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs uppercase font-mono shrink-0">
                            {u.name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-bold text-ink-primary flex items-center gap-1.5">
                              <span>{u.name}</span>
                              {isSelf && (
                                <span className="px-1.5 py-0.2 bg-slate-100 text-ink-secondary text-[10px] rounded font-mono">
                                  You
                                </span>
                              )}
                            </div>
                            <div className="text-ink-secondary text-[11px] font-mono">{u.email}</div>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-mono font-bold uppercase tracking-wider border ${badge.bg} ${badge.text} ${badge.border}`}
                        >
                          <Shield size={11} />
                          <span>{u.role.replace('_', ' ')}</span>
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold ${
                            u.isActive
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-rose-50 text-rose-700'
                          }`}
                        >
                          {u.isActive ? <CheckCircle2 size={11} /> : <UserX size={11} />}
                          <span>{u.isActive ? 'Active' : 'Suspended'}</span>
                        </span>
                      </td>

                      <td className="px-6 py-4 text-ink-secondary font-mono text-[11px]">
                        {u.preferredTopics && u.preferredTopics.length > 0
                          ? u.preferredTopics.slice(0, 2).join(', ')
                          : 'General'}
                      </td>

                      <td className="px-6 py-4 text-ink-secondary font-mono text-[11px]">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>

                      <td className="px-6 py-4 text-right space-x-2">
                        <button
                          onClick={() => {
                            setSelectedUser(u);
                            setNewRole(u.role);
                            setShowRoleModal(true);
                          }}
                          disabled={!canModifyRole}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-ink-primary rounded text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          Change Role
                        </button>

                        <button
                          onClick={() =>
                            updateStatusMutation.mutate({
                              userId: u.id,
                              isActive: !u.isActive,
                            })
                          }
                          disabled={isSelf || (isTargetSuperAdmin && !isSuperAdmin)}
                          className={`px-3 py-1.5 rounded text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                            u.isActive
                              ? 'bg-rose-50 text-rose-600 hover:bg-rose-100'
                              : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                          }`}
                        >
                          {u.isActive ? 'Suspend' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="p-12 text-center bg-white border border-border-subtle rounded-2xl">
          <Users size={28} className="mx-auto text-ink-secondary mb-2" />
          <p className="text-xs font-semibold text-ink-primary">No users found matching your search</p>
        </div>
      )}

      {/* Role Assignment Modal */}
      {showRoleModal && selectedUser && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-2 text-ink-primary">
              <ShieldCheck size={18} className="text-accent-crimson" />
              <h3 className="text-base font-bold">Assign Role: {selectedUser.name}</h3>
            </div>

            <p className="text-xs text-ink-secondary leading-relaxed">
              Select the administrative or editorial role to assign to this account. Role changes apply instantly across all session checks.
            </p>

            <div className="space-y-2 pt-2">
              {[
                {
                  role: 'USER',
                  title: 'User / Reader',
                  desc: 'Read articles, bookmark stories, and participate in discussions.',
                },
                {
                  role: 'AUTHOR',
                  title: 'Author',
                  desc: 'Write drafts, submit stories for review, and manage personal stories.',
                },
                {
                  role: 'EDITOR',
                  title: 'Editor',
                  desc: 'Review manuscripts, approve revisions, and schedule publication.',
                },
                {
                  role: 'ADMIN',
                  title: 'Administrator',
                  desc: 'Manage taxonomy, moderate comments, inspect audit logs, and oversee users.',
                },
                ...(isSuperAdmin
                  ? [
                      {
                        role: 'SUPER_ADMIN',
                        title: 'Super Administrator',
                        desc: 'Full platform governance including live database switching and role granting.',
                      },
                    ]
                  : []),
              ].map((opt) => (
                <label
                  key={opt.role}
                  className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                    newRole === opt.role
                      ? 'bg-slate-50 border-accent-crimson ring-1 ring-accent-crimson/20'
                      : 'border-border-subtle hover:bg-slate-50/50'
                  }`}
                >
                  <input
                    type="radio"
                    name="role"
                    value={opt.role}
                    checked={newRole === opt.role}
                    onChange={(e) => setNewRole(e.target.value as any)}
                    className="mt-0.5 text-accent-crimson focus:ring-accent-crimson"
                  />
                  <div>
                    <p className="text-xs font-bold text-ink-primary">{opt.title}</p>
                    <p className="text-[11px] text-ink-secondary mt-0.5">{opt.desc}</p>
                  </div>
                </label>
              ))}
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-border-subtle">
              <button
                onClick={() => setShowRoleModal(false)}
                className="px-4 py-2 text-xs font-semibold text-ink-secondary hover:text-ink-primary"
              >
                Cancel
              </button>
              <button
                onClick={() =>
                  updateRoleMutation.mutate({
                    userId: selectedUser.id,
                    role: newRole,
                  })
                }
                disabled={updateRoleMutation.isPending}
                className="px-4 py-2 bg-ink-primary hover:bg-slate-800 text-white rounded-lg text-xs font-semibold tracking-wide transition-colors"
              >
                Save Role Assignment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
