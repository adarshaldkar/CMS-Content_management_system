import React, { useState, useEffect } from 'react';

interface EditorialAvatarProps {
  name?: string;
  avatarUrl?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
}

const sizeClasses: Record<string, string> = {
  xs: 'w-6 h-6 text-[10px]',
  sm: 'w-7 h-7 text-xs',
  md: 'w-8 h-8 text-xs',
  lg: 'w-10 h-10 text-sm',
  xl: 'w-14 h-14 text-xl',
  '2xl': 'w-20 h-20 sm:w-24 sm:h-24 text-3xl font-editorial',
};

/**
 * EditorialAvatar
 * High-legibility avatar component with robust error fallback:
 * Always gracefully displays the user's initial monogram if image fails or is absent.
 */
export const EditorialAvatar: React.FC<EditorialAvatarProps> = ({
  name = 'User',
  avatarUrl,
  size = 'md',
  className = '',
}) => {
  const [hasError, setHasError] = useState(false);

  // Reset error state whenever the URL property changes
  useEffect(() => {
    setHasError(false);
  }, [avatarUrl]);

  const initial = (name?.trim().charAt(0) || 'A').toUpperCase();

  return (
    <div
      className={`${sizeClasses[size] || sizeClasses.md} rounded bg-ink-primary text-white flex items-center justify-center font-mono font-bold shrink-0 overflow-hidden select-none border border-border-subtle shadow-inner ${className}`}
      style={{ borderRadius: size === '2xl' ? 4 : 3 }}
      aria-label={`Avatar for ${name}`}
    >
      {avatarUrl && !hasError ? (
        <img
          src={avatarUrl}
          alt={name}
          className="w-full h-full object-cover"
          loading="lazy"
          decoding="async"
          onError={() => setHasError(true)}
        />
      ) : (
        <span aria-hidden="true" className="tracking-tight text-white/95">
          {initial}
        </span>
      )}
    </div>
  );
};
