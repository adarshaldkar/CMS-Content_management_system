import React, { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Bookmark,
  ChevronRight,
  Database,
  Edit3,
  ExternalLink,
  Flame,
  Globe,
  History,
  Inbox,
  LayoutDashboard,
  LogOut,
  Menu,
  PenTool,
  Settings,
  Shield,
  Sparkles,
  User as UserIcon,
  X,
} from 'lucide-react';
import { BrandLogo } from '../common/BrandLogo';
import { StatusBadge } from '../common/StatusBadge';
import { EditorialAvatar } from '../common/EditorialAvatar';
import { useAuthStore } from '../../stores/authStore';
import { authApi } from '../../api/auth.api';
import { notificationsApi } from '../../api/notifications.api';
import { fetchHealth } from '../../api/client';

export const UserLayout: React.FC = () => {
  const { user, clearAuth, hasRole, isAuthenticated } = useAuthStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Real-time unread notification / inbox count
  const { data: unreadData } = useQuery({
    queryKey: ['notificationsUnreadCount'],
    queryFn: () => notificationsApi.getUnreadCount(),
    enabled: Boolean(isAuthenticated),
    refetchInterval: 12000,
  });
  const unreadCount = unreadData?.unreadCount ?? 0;

  // Active database status telemetry
  const { data: healthData } = useQuery({
    queryKey: ['systemHealthTelemetry'],
    queryFn: fetchHealth,
    refetchInterval: 15000,
  });
  const activeDb = (healthData?.activeDatabase || 'PostgreSQL').toUpperCase();

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

  const deskGroups = [
    {
      title: 'YOUR DESK',
      items: [
        { label: 'Overview', to: '/dashboard', icon: LayoutDashboard },
        { label: 'Manuscripts & Stories', to: '/stories', icon: Edit3 },
      ],
    },
    {
      title: 'READ & FOLLOW',
      items: [
        {
          label: 'Gazette Inbox',
          to: '/inbox',
          icon: Inbox,
          badge: unreadCount > 0 ? (unreadCount > 99 ? '99+' : String(unreadCount)) : undefined,
        },
        { label: 'Saved Library', to: '/library', icon: Bookmark },
        { label: 'Reading History', to: '/history', icon: History },
        { label: 'For You Feed', to: '/feed', icon: Flame },
      ],
    },
    {
      title: 'ACCOUNT & SECURITY',
      items: [
        { label: 'Profile Settings', to: '/profile', icon: UserIcon },
        { label: 'Account Security', to: '/settings', icon: Settings },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-canvas-paper flex flex-col lg:flex-row font-sans text-ink-primary selection:bg-accent-crimson selection:text-white">
      {/* ─── Mobile Top App Bar ─── */}
      <header className="lg:hidden h-14 bg-white/95 backdrop-blur-md border-b border-border-subtle px-4 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 text-ink-secondary hover:text-ink-primary hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <BrandLogo size="sm" />
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/editor"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-accent-crimson hover:bg-accent-crimson-hover text-white rounded-lg text-xs font-semibold shadow-xs"
          >
            <PenTool size={12} />
            <span>Write</span>
          </Link>
          <Link to="/profile" className="flex items-center">
            <EditorialAvatar name={user?.name} avatarUrl={user?.avatarUrl} size="sm" />
          </Link>
        </div>
      </header>

      {/* ─── Mobile Backdrop Overlay ─── */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-xs z-40 lg:hidden animate-in fade-in duration-200"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* ─── Author Workspace Sidebar ─── */}
      <aside
        className={`w-64 bg-white border-r border-border-subtle flex flex-col fixed inset-y-0 left-0 z-50 transition-transform duration-200 ease-in-out shadow-xs ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="p-4 sm:p-5 border-b border-border-subtle flex items-center justify-between bg-slate-50/40">
          <BrandLogo size="sm" showSubtitle />
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="lg:hidden p-1 text-ink-secondary hover:text-ink-primary rounded cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* WRITE / STUDIO CTA BUTTON */}
        <div className="p-4 border-b border-border-subtle">
          <Link
            to="/editor"
            onClick={() => setMobileMenuOpen(false)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-ink-primary text-white hover:bg-slate-800 rounded-xl text-xs font-semibold tracking-wide transition-all shadow-xs hover:shadow-md active:scale-[0.98]"
          >
            <PenTool size={14} className="text-amber-400" />
            <span>Write New Story</span>
          </Link>
        </div>

        {/* DESK NAVIGATION GROUPS */}
        <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto custom-scrollbar">
          {deskGroups.map((group) => (
            <div key={group.title} className="space-y-1">
              <div className="px-3 pb-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-ink-muted flex items-center justify-between">
                <span>{group.title}</span>
              </div>
              {group.items.map((item) => {
                const isCurrentActive =
                  location.pathname === item.to ||
                  (item.to === '/history' && location.pathname === '/history');

                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={() => setMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all duration-150 group ${
                        isActive || isCurrentActive
                          ? 'bg-ink-primary text-white font-semibold shadow-xs'
                          : 'text-ink-secondary hover:text-ink-primary hover:bg-slate-100/80'
                      }`
                    }
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <item.icon
                        size={15}
                        className={`transition-colors shrink-0 ${
                          isCurrentActive
                            ? 'text-accent-crimson-hover'
                            : 'text-ink-muted group-hover:text-ink-primary'
                        }`}
                      />
                      <span className="truncate font-serif text-[13px]">{item.label}</span>
                    </div>

                    {item.badge && (
                      <span className="px-1.5 py-0.5 text-[10px] font-mono font-bold rounded-full bg-accent-crimson text-white shrink-0">
                        {item.badge}
                      </span>
                    )}
                  </NavLink>
                );
              })}
            </div>
          ))}

          {/* Admin Switcher (If Super Admin, Admin, or Editor) */}
          {hasRole(['super_admin', 'admin', 'editor']) && (
            <div className="pt-3 border-t border-border-subtle space-y-1">
              <div className="px-3 pb-1 text-[10px] font-mono font-bold uppercase tracking-wider text-purple-700 flex items-center justify-between">
                <span>GOVERNANCE</span>
                <span className="text-[9px] bg-purple-100 text-purple-800 px-1.5 py-0.2 rounded font-mono">
                  STAFF
                </span>
              </div>
              <Link
                to="/admin"
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                  location.pathname.startsWith('/admin')
                    ? 'bg-purple-700 text-white font-semibold shadow-xs'
                    : 'text-purple-700 hover:bg-purple-50'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Shield size={15} />
                  <span className="font-serif text-[13px]">Admin Panel</span>
                </div>
                <ChevronRight size={13} className="opacity-70" />
              </Link>
            </div>
          )}
        </nav>

        {/* User Profile Dossier Footer */}
        <div className="p-3.5 border-t border-border-subtle bg-slate-50/80">
          <div className="p-2.5 bg-white rounded-xl border border-border-subtle shadow-2xs mb-2.5">
            <div className="flex items-center gap-2.5">
              <EditorialAvatar name={user?.name} avatarUrl={user?.avatarUrl} size="md" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-ink-primary truncate font-serif">{user?.name}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] font-mono text-ink-muted uppercase truncate">
                    {user?.role?.replace('_', ' ') || 'JOURNALIST'}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] font-mono text-ink-muted">
              <span>ACTIVE DB:</span>
              <span className="font-bold text-sky-700">{activeDb}</span>
            </div>
          </div>

          <div className="flex items-center justify-between px-1 text-[11px] font-mono">
            <Link
              to="/"
              className="flex items-center gap-1.5 text-ink-secondary hover:text-ink-primary transition-colors"
            >
              <Globe size={13} />
              <span>Public Site</span>
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-1 text-rose-600 hover:text-rose-700 transition-colors cursor-pointer"
            >
              <LogOut size={13} />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-64 flex flex-col min-h-screen w-full min-w-0">
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-6xl w-full mx-auto min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
