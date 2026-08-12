import React from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  CheckSquare,
  Database,
  FileText,
  FolderTree,
  Globe,
  HardDrive,
  Image as ImageIcon,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  ScrollText,
  Shield,
  Tag,
  Users,
} from 'lucide-react';
import { BrandLogo } from '../common/BrandLogo';
import { StatusBadge } from '../common/StatusBadge';
import { useAuthStore } from '../../stores/authStore';
import { authApi } from '../../api/auth.api';
import { fetchHealth } from '../../api/client';

export const AdminLayout: React.FC = () => {
  const { user, clearAuth, hasRole } = useAuthStore();
  const navigate = useNavigate();

  const { data: health } = useQuery({
    queryKey: ['systemHealth'],
    queryFn: fetchHealth,
    refetchInterval: 15000,
  });

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch {
      // Clear auth on network failure
    } finally {
      clearAuth();
      navigate('/');
    }
  };

  const navItems = [
    { label: 'Overview', to: '/admin', icon: LayoutDashboard, exact: true },
    { label: 'Review Queue', to: '/admin/review', icon: CheckSquare },
    { label: 'User Directory', to: '/admin/users', icon: Users },
    { label: 'Categories', to: '/admin/categories', icon: FolderTree },
    { label: 'Tags', to: '/admin/tags', icon: Tag },
    { label: 'Media Assets', to: '/admin/media', icon: ImageIcon },
    { label: 'Comments Moderation', to: '/admin/comments', icon: MessageSquare },
    { label: 'Audit Trail', to: '/admin/audit', icon: ScrollText },
  ];

  const activeDb = health?.activeDatabase || 'postgres';
  const isPostgres = activeDb.toLowerCase() === 'postgres';

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex font-sans">
      {/* Admin Sidebar */}
      <aside className="w-64 bg-slate-950 border-r border-slate-800 flex flex-col fixed inset-y-0 z-30">
        {/* Brand */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <BrandLogo variant="light" size="sm" />
        </div>

        {/* Database Health Status Indicator */}
        <div className="p-4 border-b border-slate-800 bg-slate-900/60">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 flex items-center gap-1.5 font-mono text-[11px]">
              <HardDrive size={13} />
              <span>ACTIVE DB:</span>
            </span>
            <span
              className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono font-semibold uppercase ${
                isPostgres
                  ? 'bg-blue-950 text-blue-300 border border-blue-800'
                  : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full animate-pulse ${
                  isPostgres ? 'bg-blue-400' : 'bg-emerald-400'
                }`}
              />
              {activeDb}
            </span>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <div className="px-3 pb-2 text-[10px] font-mono uppercase tracking-wider text-slate-500">
            Editorial Operations
          </div>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.exact}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-slate-800 text-white font-semibold shadow-inner'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`
              }
            >
              <item.icon size={16} />
              <span>{item.label}</span>
            </NavLink>
          ))}

          {/* Database Control for Super Admin */}
          {hasRole('super_admin') && (
            <>
              <div className="pt-4 px-3 pb-2 text-[10px] font-mono uppercase tracking-wider text-slate-500">
                System Infrastructure
              </div>
              <NavLink
                to="/admin/database"
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-purple-900/60 text-purple-200 font-semibold border border-purple-700'
                      : 'text-purple-400 hover:text-purple-300 hover:bg-purple-950/40'
                  }`
                }
              >
                <Database size={16} />
                <span>Database Switcher</span>
              </NavLink>
            </>
          )}
        </nav>

        {/* Admin Footer / User Profile */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/80">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-purple-900 text-purple-200 border border-purple-700 flex items-center justify-center text-xs font-mono uppercase">
              {user?.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.name}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                user?.name.charAt(0) || 'A'
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-slate-200 truncate">{user?.name}</p>
              {user?.role && <StatusBadge status={user.role} size="sm" />}
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-800">
            <Link
              to="/"
              className="flex items-center gap-1.5 text-[11px] text-slate-400 hover:text-slate-200 transition-colors"
            >
              <Globe size={13} />
              <span>Public Site</span>
            </Link>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1 text-[11px] text-rose-400 hover:text-rose-300 transition-colors"
            >
              <LogOut size={13} />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Admin View Container */}
      <div className="flex-1 pl-64 flex flex-col min-h-screen">
        <main className="flex-1 p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
