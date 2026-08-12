import React from 'react';
import { NavLink } from 'react-router-dom';
import { Compass, Flame } from 'lucide-react';

const CATEGORIES = [
  { name: 'Technology', slug: 'technology' },
  { name: 'Artificial Intelligence', slug: 'ai' },
  { name: 'Cybersecurity', slug: 'cybersecurity' },
  { name: 'Editorial Design', slug: 'editorial-design' },
  { name: 'Software Architecture', slug: 'software-architecture' },
  { name: 'Media & Society', slug: 'media-culture' },
  { name: 'Science', slug: 'science' },
  { name: 'Governance', slug: 'policy-governance' },
];

export const CategoryNav: React.FC = () => {
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

          <div className="h-4 w-px bg-border-subtle mx-2" />

          {CATEGORIES.map((cat) => (
            <NavLink
              key={cat.slug}
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
