import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CheckCircle2, Image as ImageIcon, Mail, Save, Shield, User as UserIcon } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { StatusBadge } from '../../components/common/StatusBadge';
import { authApi } from '../../api/auth.api';

const profileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  bio: z.string().max(500, 'Bio cannot exceed 500 characters').optional(),
  avatarUrl: z.string().url('Must be a valid URL').or(z.literal('')).optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export const UserProfilePage: React.FC = () => {
  const { user, updateUser } = useAuthStore();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name || '',
      bio: user?.bio || '',
      avatarUrl: user?.avatarUrl || '',
    },
  });

  const avatarUrlVal = watch('avatarUrl');

  const onSubmit = async (data: ProfileFormData) => {
    setIsSubmitting(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      const updatedUser = await authApi.updateProfile({
        name: data.name,
        bio: data.bio || '',
        avatarUrl: data.avatarUrl || '',
      });

      updateUser(updatedUser);
      setSuccessMessage('Your author profile has been updated successfully.');
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Failed to update profile. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-6 font-sans">
      <div>
        <h1 className="text-2xl font-editorial font-bold text-ink-primary">Author Profile</h1>
        <p className="text-xs text-ink-secondary mt-0.5">
          Manage your public byline, biographical note, and avatar appearance
        </p>
      </div>

      <div className="bg-white border border-border-subtle rounded-xl p-6 shadow-sm">
        {successMessage && (
          <div className="mb-6 p-3.5 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2.5 text-xs text-emerald-700 font-medium">
            <CheckCircle2 size={16} />
            <span>{successMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div className="mb-6 p-3.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 font-medium">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Avatar Preview Section */}
          <div className="flex items-center gap-5 pb-6 border-b border-border-subtle">
            <div className="w-16 h-16 rounded-full bg-slate-800 text-white flex items-center justify-center text-xl font-mono uppercase font-bold overflow-hidden shrink-0 border border-border-subtle">
              {avatarUrlVal ? (
                <img
                  src={avatarUrlVal}
                  alt="Avatar Preview"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              ) : (
                user?.name.charAt(0) || 'A'
              )}
            </div>
            <div className="flex-1">
              <label className="block text-xs font-semibold text-ink-primary uppercase font-mono tracking-wider">
                Avatar Image URL
              </label>
              <div className="mt-1.5 relative">
                <input
                  type="url"
                  {...register('avatarUrl')}
                  placeholder="https://example.com/avatar.jpg"
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-crimson/20 focus:border-accent-crimson transition-all text-ink-primary"
                />
                <ImageIcon size={15} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-ink-secondary" />
              </div>
              {errors.avatarUrl && (
                <p className="mt-1 text-xs text-rose-600 font-medium">{errors.avatarUrl.message}</p>
              )}
            </div>
          </div>

          {/* Full Name */}
          <div>
            <label className="block text-xs font-semibold text-ink-primary uppercase font-mono tracking-wider">
              Display Name
            </label>
            <div className="mt-1.5 relative">
              <input
                type="text"
                {...register('name')}
                placeholder="Adarsh Aldkar"
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-crimson/20 focus:border-accent-crimson transition-all text-ink-primary"
              />
              <UserIcon size={15} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-ink-secondary" />
            </div>
            {errors.name && (
              <p className="mt-1 text-xs text-rose-600 font-medium">{errors.name.message}</p>
            )}
          </div>

          {/* Biographical Note */}
          <div>
            <label className="block text-xs font-semibold text-ink-primary uppercase font-mono tracking-wider">
              Author Bio
            </label>
            <textarea
              {...register('bio')}
              rows={4}
              placeholder="Tell readers about your background, editorial focus, and research areas..."
              className="mt-1.5 w-full p-3 text-xs bg-slate-50 border border-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-crimson/20 focus:border-accent-crimson transition-all text-ink-primary"
            />
            {errors.bio && (
              <p className="mt-1 text-xs text-rose-600 font-medium">{errors.bio.message}</p>
            )}
          </div>

          {/* Read-Only Account Details */}
          <div className="p-4 bg-slate-50 rounded-lg border border-border-subtle flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-ink-secondary font-mono">
              <Mail size={14} />
              <span>{user?.email}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-ink-secondary text-[11px]">Assigned Role:</span>
              {user?.role && <StatusBadge status={user.role} />}
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-ink-primary hover:bg-slate-800 text-white rounded-lg text-xs font-semibold tracking-wide transition-colors shadow-sm disabled:opacity-50"
          >
            <Save size={14} />
            <span>{isSubmitting ? 'Saving...' : 'Save Profile Changes'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
