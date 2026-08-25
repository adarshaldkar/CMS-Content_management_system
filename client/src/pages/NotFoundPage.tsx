import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Compass, FileQuestion, Flame, Home, Search } from 'lucide-react';
import { BrandLogo } from '../components/common/BrandLogo';

export const NotFoundPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <div className="min-h-screen bg-canvas-paper flex flex-col justify-between font-sans text-ink-primary">
      {/* Top Simple Header */}
      <header className="border-b border-border-subtle py-4 px-6 sm:px-12 bg-white/70 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <BrandLogo size="md" />
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-ink-secondary hover:text-ink-primary transition-colors"
          >
            <ArrowLeft size={14} />
            <span>Return to Front Page</span>
          </Link>
        </div>
      </header>

      {/* Main 404 Editorial Presentation */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-16 text-center space-y-8 flex-1 flex flex-col justify-center">
        {/* Large Decorative Serif 404 Badge */}
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-rose-50 border border-rose-200 rounded-full text-accent-crimson text-xs font-mono font-bold uppercase tracking-widest">
            <FileQuestion size={14} />
            <span>Edition Not Found · 404 Error</span>
          </div>

          <h1 className="text-6xl sm:text-8xl font-editorial font-bold text-ink-primary tracking-tighter">
            404
          </h1>

          <h2 className="text-2xl sm:text-3xl font-editorial font-semibold text-ink-primary tracking-tight">
            The Requested Manuscript is Unavailable
          </h2>

          <p className="text-sm text-ink-secondary max-w-lg mx-auto font-sans leading-relaxed">
            The article, topic archive, or editorial dispatch you requested may have been relocated, archived under a new taxonomy, or is temporarily unavailable in this press run.
          </p>
        </div>

        {/* In-Page Quick Search Box */}
        <div className="max-w-md mx-auto w-full">
          <form onSubmit={handleSearch} className="relative">
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Gazette archives by keyword or topic..."
              className="w-full pl-11 pr-24 py-3 bg-white border border-border-subtle rounded-xl text-xs focus:outline-none focus:border-ink-primary shadow-xs transition-all"
            />
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-secondary" />
            <button
              type="submit"
              className="absolute right-2 top-1/2 -translate-y-1/2 px-3.5 py-1.5 bg-ink-primary hover:bg-slate-800 text-white rounded-lg text-xs font-semibold tracking-wider uppercase transition-colors font-mono"
            >
              Search
            </button>
          </form>
        </div>

        {/* Quick Navigation Hub */}
        <div className="pt-6 border-t border-border-subtle max-w-xl mx-auto w-full">
          <p className="text-[11px] font-mono uppercase tracking-widest text-ink-secondary mb-4">
            Recommended Editorial Destinations
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs font-mono">
            <Link
              to="/"
              className="p-3 bg-white border border-border-subtle hover:border-ink-primary rounded-lg transition-all flex flex-col items-center gap-1.5 text-center shadow-2xs hover:shadow-xs group"
            >
              <Home size={16} className="text-accent-crimson group-hover:scale-110 transition-transform" />
              <span className="font-semibold text-ink-primary">Front Page</span>
            </Link>

            <Link
              to="/search?sortBy=trending"
              className="p-3 bg-white border border-border-subtle hover:border-ink-primary rounded-lg transition-all flex flex-col items-center gap-1.5 text-center shadow-2xs hover:shadow-xs group"
            >
              <Flame size={16} className="text-amber-500 group-hover:scale-110 transition-transform" />
              <span className="font-semibold text-ink-primary">Trending Stories</span>
            </Link>

            <Link
              to="/search"
              className="p-3 bg-white border border-border-subtle hover:border-ink-primary rounded-lg transition-all flex flex-col items-center gap-1.5 text-center shadow-2xs hover:shadow-xs group col-span-2 sm:col-span-1"
            >
              <Compass size={16} className="text-sky-600 group-hover:scale-110 transition-transform" />
              <span className="font-semibold text-ink-primary">Topic Index</span>
            </Link>
          </div>
        </div>
      </main>

      {/* Bottom Simple Footer */}
      <footer className="py-6 border-t border-border-subtle text-center text-xs font-mono text-ink-secondary">
        <span>© {new Date().getFullYear()} The Gazette Publishing Group. All rights reserved.</span>
      </footer>
    </div>
  );
};
