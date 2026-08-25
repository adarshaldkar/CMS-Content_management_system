import React from 'react';
import { Outlet } from 'react-router-dom';
import { PublicHeader } from './PublicHeader';
import { CategoryNav } from './CategoryNav';
import { TrendingTicker } from './TrendingTicker';
import { PublicFooter } from './PublicFooter';

export const PublicLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-canvas-paper flex flex-col font-sans text-ink-primary">
      {/* Top Editorial Bar & Search */}
      <PublicHeader />

      {/* Category Navigation Pills */}
      <CategoryNav />

      {/* Real-time Trending Topics Ticker (NSE India style with hover-pause) */}
      <TrendingTicker />

      {/* Main Editorial Content Outlet */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Editorial Footer */}
      <PublicFooter />
    </div>
  );
};
