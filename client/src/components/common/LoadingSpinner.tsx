import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  fullPage?: boolean;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  label,
  fullPage = false,
}) => {
  const sizeMap = {
    sm: 16,
    md: 24,
    lg: 36,
  };

  const spinner = (
    <div className="flex flex-col items-center justify-center gap-3 p-4">
      <Loader2 size={sizeMap[size]} className="animate-spin text-accent-crimson" />
      {label && <p className="text-sm font-sans text-ink-secondary">{label}</p>}
    </div>
  );

  if (fullPage) {
    return (
      <div className="min-h-screen bg-canvas-paper flex items-center justify-center">
        {spinner}
      </div>
    );
  }

  return spinner;
};
