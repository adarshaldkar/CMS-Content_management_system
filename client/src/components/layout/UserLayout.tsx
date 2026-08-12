import React from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  Bookmark,
  ChevronRight,
  Edit3,
  Flame,
  Globe,
  History,
  LayoutDashboard,
  LogOut,
  PenTool,
  Settings,
  Shield,
  User as UserIcon,
  Users,
} from 'lucide-react';
import { BrandLogo } from '../common/BrandLogo';
import { StatusBadge } from '../common/StatusBadge';
import { useAuthStore } from '../../stores/authStore';
import { authApi } from '../../api/auth.api';

export const UserLayout: React.FC = () => {
  const { user, clearAuth, hasRole } = useAuthStore();
  const navigate = useNavigate();

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
        { label: 'Stories & Drafts', to: '/stories', icon: Edit3 },
      ],
    },
    {
      title: 'READ & FOLLOW',
      items: [
        { label: 'Saved Library', to: '/library', icon: Bookmark },
        { label: 'Reading History', to: '/history', icon: History },
        { label: 'For You Feed', to: '/feed', icon: Flame },
      ],
    },
    {
      title: 'ACCOUNT',
      items: [
        { label: 'Profile Settings', to: '/profile', icon: UserIcon },
        { label: 'Account Security', to: '/settings', icon: Settings },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-canvas-paper flex font-sans text-ink-primary">
      {/* Author Workspace Sidebar */}
      <aside className="w-64 bg-white border-r border-border-subtle flex flex-col fixed inset-y-0 z-30">
        {/* Brand Header */}
        <div className="p-5 border-b border-border-subtle flex items-center justify-between">
          <BrandLogo size="sm" />
        </div>

        {/* WRITE SECTION */}
        <div className="p-4 border-b border-border-subtle">
          <Link
            to="/editor"
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-ink-primary text-white hover:bg-slate-800 rounded-lg text-xs font-semibold tracking-wide transition-colors shadow-sm"
          >
            <PenTool size={14} />
            <span>Write New Story</span>
          </Link>
        </div>

        {/* DESK NAVIGATION GROUPS */}
        <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto">
          {deskGroups.map((group) => (
            <div key={group.title} className="space-y-1">
              <div className="px-3 pb-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-ink-secondary">
                {group.title}
              </div>
              {group.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                      isActive
                        ? 'bg-slate-100 text-ink-primary font-semibold'
                        : 'text-ink-secondary hover:text-ink-primary hover:bg-slate-50'
                    }`
                  }
                >
                  <item.icon size={15} />
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </div>
          ))}

          {/* Admin Switcher if authorized */}
          {hasRole(['super_admin', 'admin', 'editor']) && (
            <div className="pt-2 border-t border-border-subtle space-y-1">
              <div className="px-3 pb-1 text-[10px] font-mono font-bold uppercase tracking-wider text-purple-700">
                GOVERNANCE
              </div>
              <Link
                to="/admin"
                className="flex items-center justify-between px-3 py-2 rounded-md text-xs font-medium text-purple-700 hover:bg-purple-50 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Shield size={15} />
                  <span>Admin Panel</span>
                </div>
                <ChevronRight size={13} />
              </Link>
            </div>
          )}
        </nav>

        {/* User Profile Footer */}
        <div className="p-4 border-t border-border-subtle bg-slate-50/50">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-mono uppercase">
              {user?.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.name}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                user?.name.charAt(0) || 'U'
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-ink-primary truncate">{user?.name}</p>
              {user?.role && <StatusBadge status={user.role} size="sm" />}
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-border-subtle/60">
            <Link
              to="/"
              className="flex items-center gap-1.5 text-[11px] text-ink-secondary hover:text-ink-primary transition-colors font-mono"
            >
              <Globe size={13} />
              <span>Public Site</span>
            </Link>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1 text-[11px] text-rose-600 hover:text-rose-700 transition-colors font-mono"
            >
              <LogOut size={13} />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 pl-64 flex flex-col min-h-screen">
        <main className="flex-1 p-8 max-w-6xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
