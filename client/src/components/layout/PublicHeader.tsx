import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Bell,
  Bookmark,
  ChevronDown,
  Compass,
  Edit3,
  Flame,
  History,
  Inbox,
  LayoutDashboard,
  LogOut,
  Search,
  Settings,
  Shield,
  User as UserIcon,
} from 'lucide-react';
import { BrandLogo } from '../common/BrandLogo';
import { EditorialAvatar } from '../common/EditorialAvatar';
import { useAuthStore } from '../../stores/authStore';
import { authApi } from '../../api/auth.api';
import { notificationsApi } from '../../api/notifications.api';
import { NotificationDrawer } from '../notifications/NotificationDrawer';

const headerDateFormatter = new Intl.DateTimeFormat('en-US', {
  weekday: 'long',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
});

export const PublicHeader: React.FC = () => {
  const { user, isAuthenticated, clearAuth, hasRole } = useAuthStore();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const navigate = useNavigate();

  // Real-time unread notification count query
  const { data: unreadData } = useQuery({
    queryKey: ['notificationsUnreadCount'],
    queryFn: () => notificationsApi.getUnreadCount(),
    enabled: Boolean(isAuthenticated),
    refetchInterval: 10000,
  });
  const unreadCount = unreadData?.unreadCount ?? 0;

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch {
      // Safe fallback
    } finally {
      clearAuth();
      setDropdownOpen(false);
      navigate('/');
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchOpen(false);
    }
  };

  const todayFormatted = headerDateFormatter.format(new Date());

  return (
    <header className="border-b border-border-subtle bg-white/80 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left: Brand & Date */}
          <div className="flex items-center gap-8">
            <BrandLogo size="md" />
            <div className="hidden md:flex items-center text-xs font-mono text-ink-secondary border-l border-border-subtle pl-6">
              <span>{todayFormatted}</span>
            </div>
          </div>

          {/* Right: Search & Auth Actions */}
          <div className="flex items-center gap-3">
            {/* Command Palette / Search Quick Trigger (Ctrl+K) */}
            <button
              type="button"
              onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }))}
              className="hidden sm:inline-flex items-center gap-2 px-2.5 py-1 text-xs font-mono text-ink-secondary bg-canvas-subtle hover:bg-slate-200 border border-border-subtle rounded transition-colors"
              title="Global Command Palette (Ctrl+K)"
            >
              <Search size={13} className="text-ink-muted" />
              <span>Search...</span>
              <kbd className="px-1.5 py-0.2 bg-white dark:bg-zinc-800 border border-border-subtle text-[10px] text-ink-muted rounded">
                ⌘K
              </kbd>
            </button>

            {/* Mobile Search Link */}
            <Link
              to="/search"
              className="sm:hidden p-2 text-ink-secondary hover:text-ink-primary hover:bg-slate-100 rounded-full transition-colors"
              title="Search & Filter Stories"
            >
              <Search size={19} />
            </Link>

            {isAuthenticated && user ? (
              <>
                {/* Write Story CTA */}
                <Link
                  to="/editor"
                  className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-accent-crimson hover:bg-accent-crimson-hover rounded-full transition-colors shadow-sm"
                >
                  <Edit3 size={14} />
                  <span>Write</span>
                </Link>

                {/* Notification Bell Button */}
                <button
                  onClick={() => setDrawerOpen(true)}
                  className="relative p-2 rounded-full hover:bg-slate-100 text-ink-secondary hover:text-ink-primary transition-colors focus:outline-none"
                  title="Notification Desk"
                >
                  <Bell size={18} />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-4 h-4 bg-accent-crimson text-white text-[9px] font-bold rounded-full flex items-center justify-center font-mono ring-2 ring-white animate-pulse">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </button>

                {/* User Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className="flex items-center gap-2 p-1 rounded-full hover:bg-slate-100 transition-colors focus:outline-none"
                    aria-expanded={dropdownOpen}
                    aria-haspopup="true"
                    aria-label="User navigation menu"
                  >
                    <EditorialAvatar name={user.name} avatarUrl={user.avatarUrl} size="md" />
                    <ChevronDown size={14} className="text-ink-secondary" />
                  </button>

                  {/* Dropdown Menu */}
                  {dropdownOpen && (
                    <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-border-subtle py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150 font-sans">
                      {/* User Header */}
                      <div className="px-4 py-2.5 border-b border-border-subtle bg-slate-50/50">
                        <div className="flex items-center gap-2.5">
                          <EditorialAvatar name={user.name} avatarUrl={user.avatarUrl} size="sm" />
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold font-serif text-ink-primary truncate">{user.name}</p>
                            <p className="text-[10px] font-mono text-ink-secondary truncate">{user.email}</p>
                          </div>
                        </div>
                      </div>

                      {/* YOUR DESK */}
                      <div className="px-3 pt-2 pb-1">
                        <div className="px-2 pb-1 text-[9px] font-mono font-bold uppercase tracking-wider text-ink-muted">
                          YOUR DESK
                        </div>
                        <Link
                          to="/dashboard"
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-ink-primary hover:bg-slate-100 transition-colors"
                        >
                          <LayoutDashboard size={14} className="text-ink-secondary" />
                          <span>Author Dashboard</span>
                        </Link>
                        <Link
                          to="/stories"
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-ink-primary hover:bg-slate-100 transition-colors"
                        >
                          <Edit3 size={14} className="text-ink-secondary" />
                          <span>Manuscripts & Stories</span>
                        </Link>
                      </div>

                      {/* READ & FOLLOW */}
                      <div className="px-3 py-1 border-t border-border-subtle/70">
                        <div className="px-2 pt-1 pb-1 text-[9px] font-mono font-bold uppercase tracking-wider text-ink-muted">
                          READ & FOLLOW
                        </div>
                        <Link
                          to="/feed"
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-ink-primary hover:bg-slate-100 transition-colors"
                        >
                          <Flame size={14} className="text-amber-500" />
                          <span>For You Feed</span>
                        </Link>
                        <Link
                          to="/inbox"
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium text-ink-primary hover:bg-slate-100 transition-colors"
                        >
                          <div className="flex items-center gap-2.5">
                            <Inbox size={14} className="text-accent-crimson" />
                            <span>Gazette Inbox</span>
                          </div>
                          {unreadCount > 0 && (
                            <span className="px-1.5 py-0.2 bg-accent-crimson text-white text-[9px] font-mono font-bold rounded-full">
                              {unreadCount}
                            </span>
                          )}
                        </Link>
                        <Link
                          to="/library"
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-ink-primary hover:bg-slate-100 transition-colors"
                        >
                          <Bookmark size={14} className="text-ink-secondary" />
                          <span>Saved Library</span>
                        </Link>
                        <Link
                          to="/history"
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-ink-primary hover:bg-slate-100 transition-colors"
                        >
                          <History size={14} className="text-ink-secondary" />
                          <span>Reading History</span>
                        </Link>
                      </div>

                      {/* ACCOUNT */}
                      <div className="px-3 py-1 border-t border-border-subtle/70">
                        <div className="px-2 pt-1 pb-1 text-[9px] font-mono font-bold uppercase tracking-wider text-ink-muted">
                          ACCOUNT & SECURITY
                        </div>
                        <Link
                          to="/profile"
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-ink-primary hover:bg-slate-100 transition-colors"
                        >
                          <UserIcon size={14} className="text-ink-secondary" />
                          <span>Profile Settings</span>
                        </Link>
                        <Link
                          to="/settings"
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-ink-primary hover:bg-slate-100 transition-colors"
                        >
                          <Settings size={14} className="text-ink-secondary" />
                          <span>Account Security</span>
                        </Link>
                      </div>

                      {/* GOVERNANCE */}
                      {hasRole(['super_admin', 'admin', 'editor']) && (
                        <div className="px-3 py-1 border-t border-border-subtle/70">
                          <Link
                            to="/admin"
                            onClick={() => setDropdownOpen(false)}
                            className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-purple-700 hover:bg-purple-50 transition-colors"
                          >
                            <Shield size={14} />
                            <span>Admin Governance</span>
                          </Link>
                        </div>
                      )}

                      {/* SIGN OUT */}
                      <div className="border-t border-border-subtle mt-1 pt-1 px-3">
                        <button
                          type="button"
                          onClick={handleLogout}
                          className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-rose-600 hover:bg-rose-50 transition-colors text-left cursor-pointer"
                        >
                          <LogOut size={14} />
                          <span>Sign Out</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="px-3.5 py-1.5 text-xs font-medium text-ink-primary hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="px-3.5 py-1.5 text-xs font-medium text-white bg-ink-primary hover:bg-slate-800 rounded-lg transition-colors shadow-sm"
                >
                  Get Started
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Expandable Search Drawer */}
      {searchOpen && (
        <div className="border-t border-border-subtle bg-slate-50 py-4 px-4 sm:px-6 lg:px-8">
          <form onSubmit={handleSearchSubmit} className="max-w-2xl mx-auto flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search stories by headline, topic, or keyword..."
                className="w-full pl-10 pr-4 py-2.5 text-xs bg-white border border-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-crimson/20 focus:border-accent-crimson transition-all"
                autoFocus
              />
              <Search size={16} className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-ink-secondary" />
            </div>
            <button
              type="submit"
              className="px-4 py-2.5 bg-ink-primary hover:bg-slate-800 text-white rounded-lg text-xs font-medium transition-colors"
            >
              Search
            </button>
          </form>
        </div>
      )}

      {/* Real-Time Notification Center Drawer */}
      <NotificationDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        unreadCount={unreadCount}
      />
    </header>
  );
};
