import React from 'react';
import { NavLink } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Compass, Flame } from 'lucide-react';
import { apiClient } from '../../api/client';
import type { Category } from '../../types';

interface CategoriesResponse {
  items?: Category[];
  total?: number;
}

export const CategoryNav: React.FC = () => {
  // Fetch categories from admin-managed taxonomy (dynamic, not hardcoded)
  const { data } = useQuery({
    queryKey: ['publicCategories'],
    queryFn: async () => {
      const { data } = await apiClient.get<CategoriesResponse | Category[]>('/categories', {
        params: { status: 'active', limit: 20 },
      });
      // Handle both PaginatedResult<Category> and Category[] response shapes
      if (Array.isArray(data)) return data;
      return (data as CategoriesResponse).items || [];
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes — categories rarely change
  });

  const categories: Category[] = data || [];

  return (
    <nav className="border-b border-border-subtle bg-white/50 overflow-x-auto no-scrollbar">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-1 py-2.5 min-w-max">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                isActive
                  ? 'bg-ink-primary text-white font-semibold'
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
              `flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                isActive
                  ? 'bg-ink-primary text-white font-semibold'
                  : 'text-ink-secondary hover:text-ink-primary hover:bg-slate-100'
              }`
            }
          >
            <Flame size={13} className="text-amber-500" />
            <span>For You</span>
          </NavLink>

          <NavLink
            to="/search"
            className={({ isActive }) =>
              `flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                isActive
                  ? 'bg-ink-primary text-white font-semibold'
                  : 'text-ink-secondary hover:text-ink-primary hover:bg-slate-100'
              }`
            }
          >
            <span>Search &amp; Filter</span>
          </NavLink>

          {categories.length > 0 && (
            <div className="h-4 w-px bg-border-subtle mx-2" />
          )}

          {categories.map((cat) => (
            <NavLink
              key={cat.slug || cat.id}
              to={`/category/${cat.slug}`}
              className={({ isActive }) =>
                `px-3 py-1 rounded-full text-xs font-medium transition-colors ${
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
      </div>
    </nav>
  );
};
