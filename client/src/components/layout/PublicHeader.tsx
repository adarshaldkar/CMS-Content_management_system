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
  LayoutDashboard,
  LogOut,
  Search,
  Settings,
  Shield,
  User as UserIcon,
} from 'lucide-react';
import { BrandLogo } from '../common/BrandLogo';
import { useAuthStore } from '../../stores/authStore';
import { authApi } from '../../api/auth.api';
import { notificationsApi } from '../../api/notifications.api';
import { NotificationDrawer } from '../notifications/NotificationDrawer';

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

  const todayFormatted = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date());

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
            {/* Search Link */}
            <Link
              to="/search"
              className="p-2 text-ink-secondary hover:text-ink-primary hover:bg-slate-100 rounded-full transition-colors"
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
                    className="flex items-center gap-2 p-1.5 rounded-full hover:bg-slate-100 transition-colors focus:outline-none"
                  >
                    <div className="w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center text-xs font-medium uppercase font-mono overflow-hidden">
                      {user.avatarUrl ? (
                        <img
                          src={user.avatarUrl}
                          alt={user.name}
                          className="w-full h-full rounded-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        user.name.charAt(0)
                      )}
                    </div>
                    <ChevronDown size={14} className="text-ink-secondary" />
                  </button>

                  {/* Dropdown Menu */}
                  {dropdownOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-border-subtle py-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150 font-sans">
                      <div className="px-4 py-2 border-b border-border-subtle">
                        <p className="text-xs font-semibold text-ink-primary truncate">{user.name}</p>
                        <p className="text-[11px] text-ink-secondary truncate">{user.email}</p>
                      </div>

                      <div className="py-1">
                        <Link
                          to="/dashboard"
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2 text-xs text-ink-primary hover:bg-slate-50 transition-colors"
                        >
                          <LayoutDashboard size={15} />
                          <span>Author Dashboard</span>
                        </Link>
                        <Link
                          to="/stories"
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2 text-xs text-ink-primary hover:bg-slate-50 transition-colors"
                        >
                          <Edit3 size={15} />
                          <span>My Stories & Drafts</span>
                        </Link>
                        <Link
                          to="/feed"
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2 text-xs text-ink-primary hover:bg-slate-50 transition-colors"
                        >
                          <Flame size={15} />
                          <span>For You Feed</span>
                        </Link>
                        <Link
                          to="/library"
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2 text-xs text-ink-primary hover:bg-slate-50 transition-colors"
                        >
                          <Bookmark size={15} />
                          <span>Saved Library</span>
                        </Link>
                        <Link
                          to="/profile"
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2 text-xs text-ink-primary hover:bg-slate-50 transition-colors"
                        >
                          <UserIcon size={15} />
                          <span>Author Profile</span>
                        </Link>
                        <Link
                          to="/settings"
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2 text-xs text-ink-primary hover:bg-slate-50 transition-colors"
                        >
                          <Settings size={15} />
                          <span>Security & Sessions</span>
                        </Link>

                        {hasRole(['super_admin', 'admin', 'editor']) && (
                          <Link
                            to="/admin"
                            onClick={() => setDropdownOpen(false)}
                            className="flex items-center gap-2.5 px-4 py-2 text-xs text-purple-700 hover:bg-purple-50 transition-colors border-t border-border-subtle mt-1 pt-2 font-medium"
                          >
                            <Shield size={15} />
                            <span>Admin Governance</span>
                          </Link>
                        )}
                      </div>

                      <div className="border-t border-border-subtle pt-1">
                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-rose-600 hover:bg-rose-50 transition-colors text-left"
                        >
                          <LogOut size={15} />
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
