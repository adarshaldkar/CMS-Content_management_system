import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  FolderPlus,
  Hash,
  Layers,
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

  // 1. Fetch Categories
  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['adminCategories'],
    queryFn: async () => {
      const { data } = await apiClient.get<Category[]>('/categories');
      return data;
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
      if (!confirm('Are you sure you want to delete this taxonomy category?')) return;
      await apiClient.delete(`/categories/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminCategories'] });
    },
  });

  return (
    <div className="space-y-8 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-subtle pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-accent-crimson font-semibold mb-1">
            <Layers size={15} />
            <span>Taxonomy & Organization</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-editorial font-bold text-ink-primary">
            Categories & Editorial Tags
          </h1>
          <p className="text-xs text-ink-secondary mt-1">
            Define editorial sections, slug paths, and topic tags used across the publication.
          </p>
        </div>

        <button
          onClick={() => {
            setEditingCategory(null);
            setName('');
            setSlug('');
            setDescription('');
            setShowModal(true);
          }}
          className="flex items-center gap-1.5 px-4 py-2 bg-ink-primary hover:bg-slate-800 text-white rounded-lg text-xs font-semibold tracking-wide transition-colors shadow-sm self-start sm:self-auto"
        >
          <Plus size={14} />
          <span>New Category</span>
        </button>
      </div>

      {/* Categories Grid */}
      {isLoading ? (
        <div className="py-20 text-center">
          <LoadingSpinner label="Loading taxonomy..." />
        </div>
      ) : categories.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((category) => (
            <div
              key={category.id}
              className="bg-white border border-border-subtle rounded-xl p-5 shadow-sm space-y-3 flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-accent-crimson font-bold">
                    Section
                  </span>
                  <span className="text-[11px] font-mono text-ink-secondary">
                    slug: /{category.slug}
                  </span>
                </div>

                <h3 className="text-base font-editorial font-bold text-ink-primary">
                  {category.name}
                </h3>

                <p className="text-xs text-ink-secondary line-clamp-2 leading-relaxed">
                  {category.description || 'Editorial articles and dispatches.'}
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border-subtle/60">
                <button
                  onClick={() => {
                    setEditingCategory(category);
                    setName(category.name);
                    setSlug(category.slug);
                    setDescription(category.description || '');
                    setShowModal(true);
                  }}
                  className="p-1.5 text-ink-secondary hover:text-ink-primary hover:bg-slate-100 rounded"
                >
                  <Pencil size={13} />
                </button>
                <button
                  onClick={() => deleteCategoryMutation.mutate(category.id)}
                  className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-12 text-center bg-white border border-border-subtle rounded-2xl">
          <FolderPlus size={28} className="mx-auto text-ink-secondary mb-2" />
          <p className="text-xs font-semibold text-ink-primary">No categories created yet</p>
          <p className="text-xs text-ink-secondary mt-1">Create categories to structure your publication.</p>
        </div>
      )}

      {/* Category Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-base font-bold text-ink-primary">
              {editingCategory ? 'Edit Category' : 'Create New Category'}
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-ink-primary mb-1">Category Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (!editingCategory) {
                      setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-'));
                    }
                  }}
                  placeholder="e.g. Artificial Intelligence"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-crimson/20"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-ink-primary mb-1">URL Slug</label>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="e.g. artificial-intelligence"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-crimson/20 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-ink-primary mb-1">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Short description of this section..."
                  rows={3}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-crimson/20"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-border-subtle">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-xs font-semibold text-ink-secondary"
              >
                Cancel
              </button>
              <button
                onClick={() => saveCategoryMutation.mutate()}
                disabled={!name.trim() || saveCategoryMutation.isPending}
                className="px-4 py-2 bg-ink-primary hover:bg-slate-800 text-white rounded-lg text-xs font-semibold tracking-wide transition-colors"
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
