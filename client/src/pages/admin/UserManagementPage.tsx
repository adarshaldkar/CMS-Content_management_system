import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CheckCircle2,
  Search,
  Shield,
  ShieldCheck,
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

  return (
    <div className="space-y-6 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-subtle pb-6">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.18em] text-accent-crimson font-semibold mb-1">
            <Users size={13} />
            <span>Identity Governance</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-editorial font-semibold text-ink-primary">
            User Directory & Access Control
          </h1>
          <p className="text-xs text-ink-secondary mt-1">
            Manage user accounts, assign editorial roles, and govern account activation states.
          </p>
        </div>

        {/* Search & Filters */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <input
              type="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name or email…"
              className="w-56 sm:w-64 pl-8 pr-3 py-1.5 text-xs bg-white border border-border-subtle focus:outline-none focus:border-ink-primary font-sans"
              style={{ borderRadius: 2 }}
            />
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-secondary" />
          </div>

          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-1.5 text-xs bg-white border border-border-subtle focus:outline-none focus:border-ink-primary font-mono text-ink-primary"
            style={{ borderRadius: 2 }}
          >
            <option value="all">All Roles</option>
            <option value="SUPER_ADMIN">Super Admin</option>
            <option value="ADMIN">Admin</option>
            <option value="EDITOR">Editor</option>
            <option value="AUTHOR">Author</option>
            <option value="USER">Reader / User</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      {isLoading ? (
        <div className="py-20 text-center">
          <LoadingSpinner label="Loading user directory..." />
        </div>
      ) : users.length > 0 ? (
        <div className="bg-white border border-border-subtle overflow-hidden" style={{ borderRadius: 2 }}>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-canvas-paper border-b border-border-subtle font-mono uppercase text-[10px] text-ink-secondary">
                <tr>
                  <th className="px-5 py-3 font-semibold">User</th>
                  <th className="px-5 py-3 font-semibold">Role</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 font-semibold">Topics</th>
                  <th className="px-5 py-3 font-semibold">Joined Date</th>
                  <th className="px-5 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {users.map((u) => {
                  const isSelf = u.id === currentActor?.id;
                  const isTargetSuperAdmin = u.role === 'SUPER_ADMIN';
                  const canModifyRole = isSuperAdmin || (!isTargetSuperAdmin && !isSelf);

                  return (
                    <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-7 h-7 bg-ink-primary text-white flex items-center justify-center font-bold text-xs uppercase font-mono shrink-0"
                            style={{ borderRadius: 2 }}
                          >
                            {u.name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-semibold text-ink-primary flex items-center gap-1.5">
                              <span>{u.name}</span>
                              {isSelf && (
                                <span className="px-1.5 py-0.2 bg-slate-100 text-ink-secondary text-[10px] font-mono">
                                  You
                                </span>
                              )}
                            </div>
                            <div className="text-ink-secondary text-[11px] font-mono">{u.email}</div>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-3.5">
                        <span className="font-mono text-[10px] uppercase font-semibold text-accent-crimson tracking-wider">
                          {u.role.replace('_', ' ')}
                        </span>
                      </td>

                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1 font-mono text-[10px] font-medium uppercase ${
                            u.isActive ? 'text-emerald-700' : 'text-rose-700'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${u.isActive ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                          <span>{u.isActive ? 'Active' : 'Suspended'}</span>
                        </span>
                      </td>

                      <td className="px-5 py-3.5 text-ink-secondary font-mono text-[11px]">
                        {u.preferredTopics && u.preferredTopics.length > 0
                          ? u.preferredTopics.slice(0, 2).join(', ')
                          : '—'}
                      </td>

                      <td className="px-5 py-3.5 text-ink-secondary font-mono text-[11px] tabular-nums">
                        {new Date(u.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </td>

                      <td className="px-5 py-3.5 text-right space-x-2">
                        <button
                          onClick={() => {
                            setSelectedUser(u);
                            setNewRole(u.role);
                            setShowRoleModal(true);
                          }}
                          disabled={!canModifyRole}
                          className="px-2.5 py-1 bg-white border border-border-subtle hover:border-ink-primary text-ink-primary text-xs font-medium transition-colors disabled:opacity-30 disabled:cursor-not-allowed font-mono"
                          style={{ borderRadius: 2 }}
                        >
                          Role
                        </button>

                        <button
                          onClick={() =>
                            updateStatusMutation.mutate({
                              userId: u.id,
                              isActive: !u.isActive,
                            })
                          }
                          disabled={isSelf || (isTargetSuperAdmin && !isSuperAdmin)}
                          className={`px-2.5 py-1 text-xs font-medium border transition-colors disabled:opacity-30 disabled:cursor-not-allowed font-mono ${
                            u.isActive
                              ? 'border-rose-300 text-rose-700 hover:bg-rose-50'
                              : 'border-emerald-300 text-emerald-700 hover:bg-emerald-50'
                          }`}
                          style={{ borderRadius: 2 }}
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
        <div className="p-12 text-center bg-white border border-border-subtle" style={{ borderRadius: 2 }}>
          <Users size={24} className="mx-auto text-ink-secondary/40 mb-2" />
          <p className="text-xs font-semibold text-ink-primary">No users found matching your search</p>
        </div>
      )}

      {/* Role Assignment Modal */}
      {showRoleModal && selectedUser && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 font-sans">
          <div className="bg-white border border-border-subtle max-w-md w-full p-6 space-y-4 shadow-xl" style={{ borderRadius: 2 }}>
            <div className="flex items-center gap-2 text-ink-primary">
              <ShieldCheck size={16} className="text-accent-crimson" />
              <h3 className="text-base font-bold">Assign Role: {selectedUser.name}</h3>
            </div>

            <p className="text-xs text-ink-secondary leading-relaxed">
              Select the administrative or editorial role to assign to this account. Role changes apply immediately across all security checks.
            </p>

            <div className="space-y-1.5 pt-2">
              {[
                {
                  role: 'USER',
                  title: 'Reader / User',
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
                  className={`flex items-start gap-3 p-2.5 border cursor-pointer transition-colors ${
                    newRole === opt.role
                      ? 'bg-canvas-paper border-ink-primary'
                      : 'border-border-subtle hover:bg-slate-50/50'
                  }`}
                  style={{ borderRadius: 2 }}
                >
                  <input
                    type="radio"
                    name="role"
                    value={opt.role}
                    checked={newRole === opt.role}
                    onChange={(e) => setNewRole(e.target.value as any)}
                    className="mt-0.5 text-accent-crimson"
                  />
                  <div>
                    <p className="text-xs font-bold text-ink-primary">{opt.title}</p>
                    <p className="text-[11px] text-ink-secondary mt-0.5">{opt.desc}</p>
                  </div>
                </label>
              ))}
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border-subtle">
              <button
                onClick={() => setShowRoleModal(false)}
                className="px-3.5 py-1.5 text-xs font-semibold text-ink-secondary hover:text-ink-primary"
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
                className="px-4 py-1.5 bg-ink-primary hover:bg-slate-800 text-white text-xs font-semibold tracking-wide transition-colors"
                style={{ borderRadius: 2 }}
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
