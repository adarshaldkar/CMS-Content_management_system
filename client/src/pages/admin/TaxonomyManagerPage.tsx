import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  FolderPlus,
  Pencil,
  Plus,
  Tag,
  Trash2,
} from 'lucide-react';
import { apiClient } from '../../api/client';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import type { Category } from '../../types';

export const TaxonomyManagerPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'categories' | 'tags'>('categories');
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');

  // 1. Fetch Categories — API returns PaginatedResult<Category>
  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['adminCategories'],
    queryFn: async () => {
      const { data } = await apiClient.get<{ items: Category[]; total: number } | Category[]>('/categories', {
        params: { limit: 100 },
      });
      // Handle both PaginatedResult<Category> and legacy Category[] shapes
      if (Array.isArray(data)) return data;
      return data.items || [];
    },
  });

  // 2. Save Category Mutation
  const saveCategoryMutation = useMutation({
    mutationFn: async () => {
      if (editingCategory) {
        const { data } = await apiClient.patch(`/categories/${editingCategory.id}`, {
          name,
          slug,
          description,
        });
        return data;
      } else {
        const { data } = await apiClient.post('/categories', {
          name,
          slug: slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          description,
        });
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminCategories'] });
      setShowModal(false);
      setEditingCategory(null);
      setName('');
      setSlug('');
      setDescription('');
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Failed to save category.');
    },
  });

  // 3. Delete Category Mutation
  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!confirm('Are you sure you want to delete this category?')) return;
      await apiClient.delete(`/categories/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminCategories'] });
    },
  });

  const handleOpenCreate = () => {
    setEditingCategory(null);
    setName('');
    setSlug('');
    setDescription('');
    setShowModal(true);
  };

  const handleOpenEdit = (cat: Category) => {
    setEditingCategory(cat);
    setName(cat.name);
    setSlug(cat.slug);
    setDescription(cat.description || '');
    setShowModal(true);
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-subtle pb-6">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.18em] text-accent-crimson font-semibold mb-1">
            <Tag size={13} />
            <span>Taxonomy Architecture</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-editorial font-semibold text-ink-primary">
            Categories & Editorial Topics
          </h1>
          <p className="text-xs text-ink-secondary mt-1">
            Structure the publication sections, curate discoverable topic tags, and organize editorial feeds.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-ink-primary hover:bg-slate-800 text-white text-xs font-semibold tracking-wide transition-colors font-mono"
          style={{ borderRadius: 2 }}
        >
          <Plus size={13} />
          <span>New Category</span>
        </button>
      </div>

      {/* Categories Table */}
      {isLoading ? (
        <div className="py-20 text-center">
          <LoadingSpinner label="Loading taxonomy trees..." />
        </div>
      ) : categories.length > 0 ? (
        <div className="bg-white border border-border-subtle overflow-hidden" style={{ borderRadius: 2 }}>
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-canvas-paper border-b border-border-subtle font-mono uppercase text-[10px] text-ink-secondary">
              <tr>
                <th className="px-5 py-3 font-semibold">Category</th>
                <th className="px-5 py-3 font-semibold">Slug Identifier</th>
                <th className="px-5 py-3 font-semibold">Description</th>
                <th className="px-5 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {categories.map((cat) => (
                <tr key={cat.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="px-5 py-3.5 font-bold font-editorial text-ink-primary text-sm">
                    {cat.name}
                  </td>
                  <td className="px-5 py-3.5 font-mono text-[11px] text-accent-crimson">
                    /{cat.slug}
                  </td>
                  <td className="px-5 py-3.5 text-ink-secondary text-xs max-w-[340px] truncate">
                    {cat.description || '—'}
                  </td>
                  <td className="px-5 py-3.5 text-right space-x-2">
                    <button
                      onClick={() => handleOpenEdit(cat)}
                      className="p-1 text-ink-secondary hover:text-ink-primary transition-colors"
                      title="Edit Category"
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      onClick={() => deleteCategoryMutation.mutate(cat.id)}
                      className="p-1 text-rose-600 hover:text-rose-800 transition-colors"
                      title="Delete Category"
                    >
                      <Trash2 size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="p-12 text-center bg-white border border-border-subtle" style={{ borderRadius: 2 }}>
          <p className="text-xs text-ink-secondary font-editorial italic">No categories created yet.</p>
        </div>
      )}

      {/* Category Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 font-sans">
          <div className="bg-white border border-border-subtle max-w-md w-full p-6 space-y-4 shadow-xl" style={{ borderRadius: 2 }}>
            <div className="flex items-center gap-2 text-ink-primary">
              <FolderPlus size={16} className="text-accent-crimson" />
              <h3 className="text-base font-bold">
                {editingCategory ? 'Edit Category' : 'Create New Category'}
              </h3>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-mono uppercase tracking-wider text-ink-secondary font-semibold block mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Cybersecurity & Cryptography"
                  className="w-full p-2 text-xs bg-canvas-paper border border-border-subtle focus:outline-none focus:border-ink-primary font-sans"
                  style={{ borderRadius: 2 }}
                />
              </div>

              <div>
                <label className="text-[10px] font-mono uppercase tracking-wider text-ink-secondary font-semibold block mb-1">
                  Slug
                </label>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="e.g. cybersecurity"
                  className="w-full p-2 text-xs bg-canvas-paper border border-border-subtle focus:outline-none focus:border-ink-primary font-mono"
                  style={{ borderRadius: 2 }}
                />
              </div>

              <div>
                <label className="text-[10px] font-mono uppercase tracking-wider text-ink-secondary font-semibold block mb-1">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief summary of what falls under this editorial topic…"
                  rows={3}
                  className="w-full p-2 text-xs bg-canvas-paper border border-border-subtle focus:outline-none focus:border-ink-primary font-sans"
                  style={{ borderRadius: 2 }}
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border-subtle">
              <button
                onClick={() => setShowModal(false)}
                className="px-3.5 py-1.5 text-xs font-semibold text-ink-secondary hover:text-ink-primary"
              >
                Cancel
              </button>
              <button
                onClick={() => saveCategoryMutation.mutate()}
                disabled={!name.trim() || saveCategoryMutation.isPending}
                className="px-4 py-1.5 bg-ink-primary hover:bg-slate-800 text-white text-xs font-semibold tracking-wide transition-colors font-mono disabled:opacity-50"
                style={{ borderRadius: 2 }}
              >
                Save Category
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
