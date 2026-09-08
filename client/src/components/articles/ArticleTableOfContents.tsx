import React, { useState, useEffect, useMemo } from 'react';
import { List, ChevronRight } from 'lucide-react';

export interface TocHeading {
  id: string;
  text: string;
  level: 2 | 3;
}

export interface ArticleTableOfContentsProps {
  htmlContent: string;
}

// Generate deterministic sanitized slug from heading text
export function sanitizeHeadingSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/<[^>]*>/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

export const ArticleTableOfContents: React.FC<ArticleTableOfContentsProps> = ({
  htmlContent,
}) => {
  const [activeId, setActiveId] = useState<string>('');

  // Extract headings from HTML string
  const headings = useMemo<TocHeading[]>(() => {
    if (!htmlContent) return [];
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');
    const nodes = doc.querySelectorAll('h2, h3');
    const items: TocHeading[] = [];

    nodes.forEach((node) => {
      const text = node.textContent?.trim() || '';
      if (text.length > 2) {
        const id = sanitizeHeadingSlug(text);
        const level = node.tagName.toLowerCase() === 'h2' ? 2 : 3;
        items.push({ id, text, level });
      }
    });

    return items;
  }, [htmlContent]);

  // Attach IDs to DOM elements in the document and track with IntersectionObserver
  useEffect(() => {
    if (headings.length < 3) return;

    // Assign IDs to matching heading elements in the article body
    const articleContainer = document.querySelector('.prose');
    if (!articleContainer) return;

    const headingElements = articleContainer.querySelectorAll('h2, h3');
    headingElements.forEach((el) => {
      const text = el.textContent?.trim() || '';
      const slug = sanitizeHeadingSlug(text);
      if (slug) {
        el.id = slug;
      }
    });

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        });
      },
      {
        rootMargin: '-80px 0px -60% 0px',
        threshold: 0.1,
      }
    );

    headingElements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [headings]);

  // Structural threshold: Only render if >= 3 meaningful headings exist
  if (headings.length < 3) {
    return null;
  }

  const handleHeadingClick = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      window.history.replaceState(null, '', `#${id}`);
      setActiveId(id);
    }
  };

  return (
    <nav
      aria-label="Table of Contents"
      className="hidden lg:block sticky top-24 max-h-[calc(100vh-8rem)] overflow-y-auto p-4 border border-border-subtle bg-canvas-paper space-y-3 select-none"
      style={{ borderRadius: 2 }}
    >
      <div className="flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-ink-primary font-bold border-b border-border-subtle pb-2">
        <List size={13} className="text-accent-crimson" />
        <span>Contents &amp; Structure</span>
      </div>

      <ul className="space-y-1 text-xs font-sans divide-y divide-border-subtle/40">
        {headings.map((h, i) => {
          const isActive = activeId === h.id || (!activeId && i === 0);

          return (
            <li key={`${h.id}-${i}`} className="pt-1.5 first:pt-0">
              <a
                href={`#${h.id}`}
                onClick={(e) => handleHeadingClick(e, h.id)}
                className={`flex items-start gap-1.5 py-1 transition-colors group ${
                  h.level === 3 ? 'pl-3 text-[11px]' : 'font-medium'
                } ${
                  isActive
                    ? 'text-accent-crimson font-bold'
                    : 'text-ink-secondary hover:text-ink-primary'
                }`}
              >
                <ChevronRight
                  size={12}
                  className={`mt-0.5 shrink-0 transition-transform ${
                    isActive
                      ? 'text-accent-crimson translate-x-0.5'
                      : 'text-border-strong opacity-0 group-hover:opacity-100'
                  }`}
                />
                <span className="line-clamp-2">{h.text}</span>
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};
