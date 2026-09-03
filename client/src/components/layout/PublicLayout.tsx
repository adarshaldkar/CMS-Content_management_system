import React from 'react';
import { Outlet } from 'react-router-dom';
import { PublicHeader } from './PublicHeader';
import { CategoryNav } from './CategoryNav';
import { TrendingTicker } from './TrendingTicker';
import { PublicFooter } from './PublicFooter';

export const PublicLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-canvas-paper flex flex-col font-sans text-ink-primary">
      {/* Skip to Content for keyboard screen reader accessibility (WCAG 2.2 AA) */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-ink-primary focus:text-white focus:font-semibold focus:shadow-md focus:outline-none"
        style={{ borderRadius: 2 }}
      >
        Skip to main content
      </a>

      {/* Top Editorial Bar & Search */}
      <PublicHeader />

      {/* Category Navigation Pills */}
      <CategoryNav />

      {/* Real-time Trending Topics Ticker (NSE India style with hover-pause) */}
      <TrendingTicker />

      {/* Main Editorial Content Outlet */}
      <main id="main-content" tabIndex={-1} className="flex-1 focus:outline-none">
        <Outlet />
      </main>

      {/* Editorial Footer */}
      <PublicFooter />
    </div>
  );
};
