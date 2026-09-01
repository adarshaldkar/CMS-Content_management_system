import React from 'react';
import { Link } from 'react-router-dom';
import { Feather } from 'lucide-react';

interface BrandLogoProps {
  variant?: 'light' | 'dark';
  size?: 'sm' | 'md' | 'lg';
  showSubtitle?: boolean;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  variant = 'dark',
  size = 'md',
  showSubtitle = false,
}) => {
  const isDark = variant === 'dark';

  const sizeClasses: Record<string, string> = {
    sm: 'text-xl',
    md: 'text-2xl',
    lg: 'text-3xl',
  };

  const iconSizes: Record<string, number> = {
    sm: 18,
    md: 22,
    lg: 26,
  };

  return (
    <Link to="/" className="inline-flex items-center gap-2.5 group focus:outline-none">
      <div
        className={`w-9 h-9 rounded-md flex items-center justify-center transition-colors ${
          isDark
            ? 'bg-ink-primary text-canvas-paper group-hover:bg-accent-crimson'
            : 'bg-canvas-paper text-ink-primary group-hover:bg-slate-200'
        }`}
      >
        <Feather size={iconSizes[size] || 22} className="transform group-hover:rotate-6 transition-transform" />
      </div>
      <div className="flex flex-col">
        <span
          className={`font-editorial font-bold tracking-tight leading-none ${sizeClasses[size] || 'text-2xl'} ${
            isDark ? 'text-ink-primary group-hover:text-accent-crimson' : 'text-canvas-paper'
          } transition-colors`}
        >
          THE GAZETTE
        </span>
        {showSubtitle && (
          <span
            className={`text-[10px] tracking-widest uppercase font-mono mt-0.5 ${
              isDark ? 'text-ink-secondary' : 'text-slate-400'
            }`}
          >
            Editorial Publishing
          </span>
        )}
      </div>
    </Link>
  );
};
