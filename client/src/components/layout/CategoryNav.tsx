import React, { useState, useRef, useEffect } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Compass,
  Zap,
  Search,
  ChevronDown,
  X,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { apiClient } from '../../api/client';
import type { Category } from '../../types';

interface CategoriesResponse {
  items?: Category[];
  total?: number;
}

export const CategoryNav: React.FC = () => {
  const [megaMenuOpen, setMegaMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Fetch categories from dynamic taxonomy
  const { data } = useQuery({
    queryKey: ['publicCategories'],
    queryFn: async () => {
      const { data } = await apiClient.get<CategoriesResponse | Category[]>('/categories', {
        params: { status: 'active', limit: 30 },
      });
      if (Array.isArray(data)) return data;
      return (data as CategoriesResponse).items || [];
    },
    staleTime: 1000 * 60 * 5,
  });

  const categories: Category[] = Array.isArray(data)
    ? data
    : Array.isArray((data as any)?.items)
    ? (data as any).items
    : [];

  // Close mega-menu on outside click or Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMegaMenuOpen(false);
    };
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMegaMenuOpen(false);
      }
    };

    if (megaMenuOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [megaMenuOpen]);

  // Curate primary desks to fit cleanly on screen without horizontal scroll
  const primaryDesks = categories.slice(0, 5);

  return (
    <nav className="border-b border-border-subtle bg-white relative z-30 shadow-xs" ref={menuRef}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between py-2">
          {/* Left: Core Navigation Desks */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-serif font-medium transition-colors ${
                  isActive
                    ? 'bg-ink-primary text-white font-semibold shadow-xs'
                    : 'text-ink-secondary hover:text-ink-primary hover:bg-slate-100'
                }`
              }
            >
              <Compass size={13} />
              <span>Front Page</span>
            </NavLink>

            <NavLink
              to="/feed"
              className={({ isActive }) =>
                `flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-serif font-medium transition-colors ${
                  isActive
                    ? 'bg-ink-primary text-white font-semibold shadow-xs'
                    : 'text-ink-secondary hover:text-ink-primary hover:bg-slate-100'
                }`
              }
            >
              <Zap size={13} className="text-amber-600" />
              <span>For You</span>
            </NavLink>

            <NavLink
              to="/search"
              className={({ isActive }) =>
                `flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-serif font-medium transition-colors ${
                  isActive
                    ? 'bg-ink-primary text-white font-semibold shadow-xs'
                    : 'text-ink-secondary hover:text-ink-primary hover:bg-slate-100'
                }`
              }
            >
              <Search size={13} />
              <span>Search &amp; Filter</span>
            </NavLink>

            {primaryDesks.length > 0 && (
              <div className="h-4 w-px bg-border-subtle mx-1 hidden sm:block" />
            )}

            {/* Primary Curated Editorial Desks */}
            {primaryDesks.map((cat) => (
              <NavLink
                key={cat.slug || cat.id}
                to={`/category/${cat.slug}`}
                className={({ isActive }) =>
                  `hidden md:inline-flex items-center px-2.5 py-1 rounded-md text-xs font-serif font-medium transition-colors ${
                    isActive
                      ? 'bg-slate-900 text-white font-semibold'
                      : 'text-ink-secondary hover:text-ink-primary hover:bg-slate-100'
                  }`
                }
              >
                {cat.name}
              </NavLink>
            ))}
          </div>

          {/* Right: Explore All Desks Trigger */}
          <div className="flex items-center">
            <button
              onClick={() => setMegaMenuOpen(!megaMenuOpen)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-mono font-medium tracking-wider uppercase transition-all ${
                megaMenuOpen
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-ink-secondary hover:text-ink-primary hover:bg-slate-100 border border-border-subtle'
              }`}
              aria-expanded={megaMenuOpen}
            >
              <Layers size={13} />
              <span>All Desks</span>
              <ChevronDown
                size={13}
                className={`transition-transform duration-200 ${megaMenuOpen ? 'rotate-180 text-white' : ''}`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Bespoke Mega-Menu Overlay (Multi-Column Editorial Index) */}
      {megaMenuOpen && (
        <div className="absolute top-full left-0 right-0 bg-white border-b border-border-subtle shadow-xl animate-fadeIn z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex items-center justify-between border-b border-border-subtle pb-4 mb-6">
              <div>
                <span className="text-[11px] font-mono font-semibold uppercase tracking-widest text-accent-crimson block">
                  Editorial Taxonomy &amp; Archives
                </span>
                <h3 className="text-xl font-serif font-bold text-ink-primary mt-0.5">
                  The Gazette Desks &amp; Coverage Areas
                </h3>
              </div>
              <button
                onClick={() => setMegaMenuOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
                aria-label="Close desks overlay"
              >
                <X size={18} />
              </button>
            </div>

            {/* Grid of Desks */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {categories.map((cat) => (
                <Link
                  key={cat.id || cat.slug}
                  to={`/category/${cat.slug}`}
                  onClick={() => setMegaMenuOpen(false)}
                  className="p-3.5 border border-border-subtle hover:border-slate-800 bg-slate-50/50 hover:bg-white rounded-lg transition-all group flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-serif font-bold text-ink-primary group-hover:text-accent-crimson transition-colors">
                        {cat.name}
                      </span>
                      <ArrowRight size={13} className="text-slate-400 group-hover:text-slate-900 group-hover:translate-x-0.5 transition-all" />
                    </div>
                    {cat.description && (
                      <p className="text-[11px] text-ink-secondary mt-1.5 line-clamp-2 leading-relaxed">
                        {cat.description}
                      </p>
                    )}
                  </div>
                  <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider mt-3 block">
                    /{cat.slug}
                  </span>
                </Link>
              ))}
            </div>

            <div className="mt-8 pt-4 border-t border-border-subtle flex items-center justify-between text-xs text-ink-secondary">
              <span className="font-mono">Total Desks: {categories.length} active coverage beats</span>
              <Link
                to="/search"
                onClick={() => setMegaMenuOpen(false)}
                className="font-semibold text-ink-primary hover:text-accent-crimson flex items-center gap-1 transition-colors"
              >
                <span>Advanced Search &amp; Discovery</span>
                <ArrowRight size={13} />
              </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};
