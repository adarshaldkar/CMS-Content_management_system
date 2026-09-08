import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import type { UserRole } from '../types';

export interface CommandAction {
  id: string;
  title: string;
  subtitle?: string;
  category: 'contextual' | 'navigation' | 'author' | 'editorial' | 'admin' | 'recent';
  shortcut?: string;
  requiredRole?: UserRole[];
  perform: () => void;
}

const RECENT_COMMANDS_KEY = 'thegazette_recent_commands_v1';

export function useCommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(RECENT_COMMANDS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, hasRole } = useAuthStore();

  // Listen for Cmd+K / Ctrl+K global hotkey
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const addRecentSearch = useCallback((term: string) => {
    if (!term.trim()) return;
    setRecentSearches((prev) => {
      const updated = [term.trim(), ...prev.filter((item) => item !== term.trim())].slice(0, 5);
      try {
        localStorage.setItem(RECENT_COMMANDS_KEY, JSON.stringify(updated));
      } catch {
        // ignore storage errors
      }
      return updated;
    });
  }, []);

  const clearRecentSearches = useCallback(() => {
    setRecentSearches([]);
    try {
      localStorage.removeItem(RECENT_COMMANDS_KEY);
    } catch {
      // ignore
    }
  }, []);

  // Compute Static & Contextual Commands based on Role & Current Location
  const getAvailableCommands = useCallback((): CommandAction[] => {
    const commands: CommandAction[] = [];
    const path = location.pathname;

    // ── 1. Dynamic Contextual Commands based on active route ───────
    if (path.startsWith('/articles/')) {
      commands.push({
        id: 'ctx-copy-link',
        title: 'Copy Article Link',
        subtitle: 'Copy current story URL to clipboard',
        category: 'contextual',
        shortcut: '⌘C',
        perform: () => {
          navigator.clipboard.writeText(window.location.href);
        },
      });
      commands.push({
        id: 'ctx-jump-comments',
        title: 'Jump to Discussion & Comments',
        subtitle: 'Scroll directly to reader discussion section',
        category: 'contextual',
        perform: () => {
          document.getElementById('comments')?.scrollIntoView({ behavior: 'smooth' });
        },
      });
    } else if (path.startsWith('/editor') || path.startsWith('/write/')) {
      commands.push({
        id: 'ctx-preview-article',
        title: 'Preview Story in Reader Mode',
        subtitle: 'Inspect formatted typography before submission',
        category: 'contextual',
        shortcut: '⌘P',
        perform: () => {
          window.dispatchEvent(new CustomEvent('thegazette_editor_preview'));
        },
      });
      commands.push({
        id: 'ctx-import-doc',
        title: 'Import Document (.docx / .pdf / .md)',
        subtitle: 'Parse manuscript into TipTap editor nodes',
        category: 'contextual',
        perform: () => {
          window.dispatchEvent(new CustomEvent('thegazette_open_doc_import'));
        },
      });
    }

    // ── 2. Navigation Actions (Public) ─────────────────────────────
    commands.push({
      id: 'nav-front-page',
      title: 'Front Page — Today\'s Edition',
      subtitle: 'The Gazette Lead Stories & Daily Briefing',
      category: 'navigation',
      shortcut: 'G H',
      perform: () => navigate('/'),
    });
    commands.push({
      id: 'nav-for-you',
      title: 'For You — Personalized Editorial Feed',
      subtitle: 'Followed authors, topics & reading history',
      category: 'navigation',
      perform: () => navigate('/for-you'),
    });
    commands.push({
      id: 'nav-search',
      title: 'Search & Category Archive Filter',
      subtitle: 'Explore journalism archives by taxonomy & tags',
      category: 'navigation',
      shortcut: 'G S',
      perform: () => navigate('/search'),
    });

    // Desks / Topics
    const desks = [
      { name: 'Technology & Computing', slug: 'technology' },
      { name: 'Artificial Intelligence', slug: 'ai' },
      { name: 'Cybersecurity & Privacy', slug: 'cybersecurity' },
      { name: 'Software Architecture', slug: 'software-architecture' },
      { name: 'Science & Physics', slug: 'science' },
      { name: 'Transnational Governance', slug: 'policy-governance' },
    ];
    desks.forEach((desk) => {
      commands.push({
        id: `desk-${desk.slug}`,
        title: `Desk: ${desk.name}`,
        subtitle: `Jump to ${desk.name} section archive`,
        category: 'navigation',
        perform: () => navigate(`/category/${desk.slug}`),
      });
    });

    // ── 3. Author Desk Actions (Requires Login) ───────────────────
    if (isAuthenticated) {
      commands.push({
        id: 'author-dashboard',
        title: 'Author Desk & Analytics Dashboard',
        subtitle: 'View readership velocity, metrics & works in progress',
        category: 'author',
        shortcut: 'G D',
        perform: () => navigate('/user/dashboard'),
      });
      commands.push({
        id: 'author-new-story',
        title: 'Write New Story in Studio',
        subtitle: 'Launch TipTap manuscript editor with auto-save',
        category: 'author',
        shortcut: 'G N',
        perform: () => navigate('/editor'),
      });
      commands.push({
        id: 'author-manuscripts',
        title: 'Manuscript Archive & Drafts',
        subtitle: 'Manage active manuscripts, drafts, and revisions',
        category: 'author',
        perform: () => navigate('/stories'),
      });
      commands.push({
        id: 'author-settings',
        title: 'Account & Profile Settings',
        subtitle: 'Update pen name, bio, and credentials',
        category: 'author',
        perform: () => navigate('/user/settings'),
      });
    }

    // ── 4. Editorial Review Actions (Editor / Super Admin) ─────────
    if (hasRole(['editor', 'admin', 'super_admin', 'EDITOR', 'ADMIN', 'SUPER_ADMIN'])) {
      commands.push({
        id: 'editorial-review-queue',
        title: 'Editorial Review & Moderation Queue',
        subtitle: 'Approve, reject, or revision-diff submitted manuscripts',
        category: 'editorial',
        shortcut: 'G R',
        perform: () => navigate('/admin/review'),
      });
      commands.push({
        id: 'editorial-slots',
        title: 'Publishing Slots & Release Schedule',
        subtitle: 'Manage front-page slots and release clearances',
        category: 'editorial',
        perform: () => navigate('/admin/slots'),
      });
      commands.push({
        id: 'editorial-taxonomy',
        title: 'Taxonomy & Section Hierarchy Manager',
        subtitle: 'Manage categories, tags, and section routing',
        category: 'editorial',
        perform: () => navigate('/admin/taxonomy'),
      });
    }

    // ── 5. System Administration Actions (Super Admin Only) ───────
    if (hasRole(['super_admin', 'SUPER_ADMIN', 'admin', 'ADMIN'])) {
      commands.push({
        id: 'admin-db-switcher',
        title: '6-Database Persistence Mesh Switcher',
        subtitle: 'Active failover: Postgres, Mongo, Cockroach, ClickHouse, MariaDB, MySQL',
        category: 'admin',
        perform: () => navigate('/admin/database-switcher'),
      });
      commands.push({
        id: 'admin-jobs-manager',
        title: 'BullMQ Queue & Worker Telemetry',
        subtitle: 'Monitor live throughput, retry delayed jobs, triage DLQ',
        category: 'admin',
        perform: () => navigate('/admin/jobs'),
      });
      commands.push({
        id: 'admin-newsletter-manager',
        title: 'Newsletter Broadcast & Campaign Studio',
        subtitle: 'Compose dispatch, monitor delivery funnel & subscribers',
        category: 'admin',
        perform: () => navigate('/admin/newsletter'),
      });
      commands.push({
        id: 'admin-audit-explorer',
        title: 'Immutable Audit Log Explorer',
        subtitle: 'Inspect cryptographic tamper-evident security logs',
        category: 'admin',
        perform: () => navigate('/admin/audit'),
      });
      commands.push({
        id: 'admin-users-manager',
        title: 'User & RBAC Permissions Directory',
        subtitle: 'Manage roles, editor clearances, and accounts',
        category: 'admin',
        perform: () => navigate('/admin/users'),
      });
    }

    return commands;
  }, [location.pathname, isAuthenticated, hasRole, navigate]);

  return {
    isOpen,
    setIsOpen,
    recentSearches,
    addRecentSearch,
    clearRecentSearches,
    getAvailableCommands,
  };
}
