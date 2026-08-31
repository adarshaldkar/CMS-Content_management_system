import React from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  CheckSquare,
  Clock,
  Database,
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
import { useAuthStore } from '../../stores/authStore';
import { authApi } from '../../api/auth.api';
import { apiClient, fetchHealth } from '../../api/client';

export const AdminLayout: React.FC = () => {
  const { user, clearAuth, hasRole } = useAuthStore();
  const navigate = useNavigate();

  const { data: dbStatus } = useQuery({
    queryKey: ['databaseStatus'],
    queryFn: async () => {
      const { data } = await apiClient.get('/database/status');
      return data;
    },
    refetchInterval: 5000,
  });

  const { data: health } = useQuery({
    queryKey: ['systemHealth'],
    queryFn: fetchHealth,
    refetchInterval: 5000,
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
    { label: 'Review Queue', to: '/admin/review', icon: CheckSquare },
    { label: 'Publishing Slots', to: '/admin/slots', icon: Clock },
    { label: 'User Directory', to: '/admin/users', icon: Users },
    { label: 'Categories', to: '/admin/categories', icon: FolderTree },
    { label: 'Tags', to: '/admin/tags', icon: Tag },
    { label: 'Media Assets', to: '/admin/media', icon: ImageIcon },
    { label: 'Comments Moderation', to: '/admin/comments', icon: MessageSquare },
    { label: 'Audit Trail', to: '/admin/audit', icon: ScrollText },
    { label: 'Control Panel', to: '/admin/panel', icon: LayoutDashboard },
  ];

  const activeDb = (dbStatus?.activeDatabase || health?.activeDatabase || 'postgres').toUpperCase();

  const getDbBadgeStyle = (db: string) => {
    switch (db) {
      case 'MONGODB':
        return { bg: 'bg-emerald-50 text-emerald-800 border-emerald-200', dot: 'bg-emerald-500' };
      case 'MARIADB':
        return { bg: 'bg-amber-50 text-amber-800 border-amber-200', dot: 'bg-amber-500' };
      case 'MYSQL':
        return { bg: 'bg-cyan-50 text-cyan-800 border-cyan-200', dot: 'bg-cyan-500' };
      case 'COCKROACH':
        return { bg: 'bg-purple-50 text-purple-800 border-purple-200', dot: 'bg-purple-500' };
      case 'CLICKHOUSE':
        return { bg: 'bg-orange-50 text-orange-800 border-orange-200', dot: 'bg-orange-500' };
      default:
        return { bg: 'bg-sky-50 text-sky-800 border-sky-200', dot: 'bg-sky-500' };
    }
  };

  const badgeStyle = getDbBadgeStyle(activeDb);

  return (
    <div className="min-h-screen bg-canvas-paper text-ink-primary flex font-sans">
      {/* Editorial Admin Sidebar */}
      <aside className="w-64 bg-white border-r border-border-subtle flex flex-col fixed inset-y-0 z-30">
        {/* Brand */}
        <div className="p-5 border-b border-border-subtle flex items-center justify-between">
          <BrandLogo size="sm" />
        </div>

        {/* Database Status Telemetry */}
        <div className="px-5 py-3 border-b border-border-subtle bg-canvas-paper">
          <div className="flex items-center justify-between text-xs">
            <span className="text-ink-secondary flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider font-semibold">
              <HardDrive size={12} />
              <span>ACTIVE DB:</span>
            </span>
            <span
              className={`inline-flex items-center gap-1.5 px-2 py-0.5 border text-[11px] font-mono font-medium uppercase ${badgeStyle.bg}`}
              style={{ borderRadius: 2 }}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${badgeStyle.dot}`} />
              {activeDb}
            </span>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          <div className="px-3 pb-2 text-[10px] font-mono uppercase tracking-[0.18em] text-accent-crimson font-semibold">
            Editorial Operations
          </div>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2 text-xs transition-colors ${
                  isActive
                    ? 'bg-canvas-paper text-ink-primary font-semibold border-l-2 border-accent-crimson'
                    : 'text-ink-secondary hover:text-ink-primary hover:bg-slate-50 border-l-2 border-transparent'
                }`
              }
            >
              <item.icon size={15} />
              <span>{item.label}</span>
            </NavLink>
          ))}

          {/* Database Control for Super Admin */}
          {hasRole('super_admin') && (
            <>
              <div className="pt-5 px-3 pb-2 text-[10px] font-mono uppercase tracking-[0.18em] text-ink-secondary font-semibold">
                System Infrastructure
              </div>
              <NavLink
                to="/admin/database"
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-3 py-2 text-xs transition-colors ${
                    isActive
                      ? 'bg-canvas-paper text-ink-primary font-semibold border-l-2 border-accent-crimson'
                      : 'text-ink-secondary hover:text-ink-primary hover:bg-slate-50 border-l-2 border-transparent'
                  }`
                }
              >
                <Database size={15} />
                <span>Database Switcher</span>
              </NavLink>
            </>
          )}
        </nav>

        {/* Admin Footer / User Profile */}
        <div className="p-4 border-t border-border-subtle bg-canvas-paper">
          <div className="flex items-center gap-3 mb-3">
            <div
              className="w-8 h-8 bg-ink-primary text-white flex items-center justify-center text-xs font-mono font-bold uppercase shrink-0"
              style={{ borderRadius: 2 }}
            >
              {user?.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                user?.name?.charAt(0) || 'A'
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-ink-primary truncate font-sans">{user?.name}</p>
              <span className="font-mono text-[10px] uppercase text-accent-crimson tracking-wider font-semibold">
                {user?.role}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-border-subtle">
            <Link
              to="/"
              className="flex items-center gap-1.5 text-[11px] text-ink-secondary hover:text-ink-primary transition-colors font-mono"
            >
              <Globe size={12} />
              <span>Public Site</span>
            </Link>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1 text-[11px] text-rose-700 hover:text-rose-900 transition-colors font-mono font-medium"
            >
              <LogOut size={12} />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Admin View Container */}
      <div className="flex-1 pl-64 flex flex-col min-h-screen">
        {/* High-Assurance Admin Security & Session Telemetry Bar */}
        <header className="h-12 bg-white border-b border-border-subtle px-8 flex items-center justify-between sticky top-0 z-20 font-mono text-[11px]">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200 font-semibold">
              <Shield size={13} className="text-emerald-600" />
              <span>HIGH-ASSURANCE SESSION</span>
            </span>
            <span className="hidden md:inline-flex items-center gap-1 text-ink-secondary">
              <span>CLEARANCE:</span>
              <span className="font-bold text-ink-primary uppercase">{user?.role}</span>
            </span>
          </div>

          <div className="flex items-center gap-4 text-ink-secondary">
            <span className="hidden sm:inline-flex items-center gap-1.5 text-[10px]">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>TLS 1.3 · CSRF ACTIVE</span>
            </span>
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-ink-primary rounded transition-colors text-[10px] font-semibold"
              title="Lock administrative session"
            >
              <LogOut size={11} />
              <span>LOCK SESSION</span>
            </button>
          </div>
        </header>

        <main className="flex-1 p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
