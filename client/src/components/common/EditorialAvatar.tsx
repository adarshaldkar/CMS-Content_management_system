import React, { useState, useEffect } from 'react';

interface EditorialAvatarProps {
  name?: string;
  avatarUrl?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  xs: 'w-6 h-6 text-[10px]',
  sm: 'w-7 h-7 text-xs',
  md: 'w-8 h-8 text-xs',
  lg: 'w-10 h-10 text-sm',
};

/**
 * EditorialAvatar
 * URL-keyed avatar component with automatic error recovery:
 * Resets error state whenever avatarUrl changes, preventing permanent fallback states.
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

  const initial = (name?.trim().charAt(0) || 'U').toUpperCase();

  return (
    <div
      className={`${sizeClasses[size]} rounded bg-ink-primary text-white flex items-center justify-center font-mono font-bold shrink-0 overflow-hidden select-none ${className}`}
      style={{ borderRadius: 2 }}
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
        <span aria-hidden="true">{initial}</span>
      )}
    </div>
  );
};
