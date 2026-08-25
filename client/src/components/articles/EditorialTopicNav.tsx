import React, { useEffect, useState } from 'react';
import { apiClient } from '../../api/client';

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface EditorialTopicNavProps {
  selectedSlug?: string;
  onSelectTopic: (slug: string) => void;
}

export const EditorialTopicNav: React.FC<EditorialTopicNavProps> = ({
  selectedSlug,
  onSelectTopic,
}) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    apiClient
      .get('/categories')
      .then((res: any) => {
        if (!mounted) return;
        const rawItems = res.data?.items || res.data || [];
        const seenNames = new Set<string>();
        const uniqueItems: Category[] = [];

        for (const cat of rawItems) {
          const norm = (cat.name || '').toLowerCase().trim();
          if (!norm || seenNames.has(norm) || /^govtech \d+/i.test(cat.name) || /^health care/i.test(cat.name)) {
            continue;
          }
          seenNames.add(norm);
          uniqueItems.push(cat);
        }

        setCategories(uniqueItems);
        setLoading(false);
      })
      .catch(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-6 overflow-x-auto py-3 text-xs tracking-wider uppercase text-stone-400 dark:text-stone-500 animate-pulse border-b border-stone-200 dark:border-stone-800">
        <span>Loading topics...</span>
      </div>
    );
  }

  return (
    <nav
      aria-label="Editorial Taxonomy Navigation"
      className="flex items-center gap-6 overflow-x-auto no-scrollbar py-3.5 border-b border-stone-200 dark:border-stone-800 text-xs tracking-widest uppercase font-serif"
    >
      <button
        onClick={() => onSelectTopic('')}
        className={`transition-colors whitespace-nowrap pb-1 ${
          !selectedSlug
            ? 'font-bold text-stone-950 dark:text-stone-50 border-b-2 border-stone-950 dark:border-stone-50'
            : 'text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100'
        }`}
      >
        All Topics
      </button>

      {categories.map((cat) => {
        const isActive = selectedSlug === cat.slug;
        return (
          <button
            key={cat.id || cat.slug}
            onClick={() => onSelectTopic(isActive ? '' : cat.slug)}
            className={`transition-colors whitespace-nowrap pb-1 ${
              isActive
                ? 'font-bold text-stone-950 dark:text-stone-50 border-b-2 border-stone-950 dark:border-stone-50'
                : 'text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100'
            }`}
          >
            {cat.name}
          </button>
        );
      })}
    </nav>
  );
};
