import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { apiClient } from '../../api/client';

interface Topic {
  id: string;
  name: string;
  count: string;
}

interface TopicSection {
  section: string;
  topics: Topic[];
}

const TOPIC_SECTIONS: TopicSection[] = [
  {
    section: 'Engineering & Systems',
    topics: [
      { id: 'technology', name: 'Technology', count: '312K' },
      { id: 'software-architecture', name: 'Software Architecture', count: '48K' },
      { id: 'cybersecurity', name: 'Cybersecurity', count: '91K' },
      { id: 'cloud-infrastructure', name: 'Cloud & Infrastructure', count: '76K' },
      { id: 'devops', name: 'DevOps', count: '55K' },
      { id: 'web-development', name: 'Web Development', count: '204K' },
    ],
  },
  {
    section: 'Artificial Intelligence',
    topics: [
      { id: 'ai', name: 'Artificial Intelligence', count: '189K' },
      { id: 'llms', name: 'Large Language Models', count: '67K' },
      { id: 'machine-learning', name: 'Machine Learning', count: '143K' },
      { id: 'data-science', name: 'Data Science', count: '98K' },
    ],
  },
  {
    section: 'Programming',
    topics: [
      { id: 'python', name: 'Python', count: '221K' },
      { id: 'javascript', name: 'JavaScript', count: '310K' },
      { id: 'react', name: 'React', count: '88K' },
      { id: 'system-design', name: 'System Design', count: '52K' },
    ],
  },
  {
    section: 'Editorial & Ideas',
    topics: [
      { id: 'editorial-design', name: 'Editorial Design', count: '22K' },
      { id: 'typography', name: 'Typography', count: '18K' },
      { id: 'media-culture', name: 'Journalism & Media', count: '41K' },
      { id: 'policy', name: 'Policy & Governance', count: '33K' },
    ],
  },
];

// Preview articles shown in the right panel — editorial teaser
const PREVIEW_ARTICLES = [
  {
    label: 'Cybersecurity',
    title: 'How Passkeys Are Replacing Passwords',
    author: 'R. Holloway',
    time: '8 min',
  },
  {
    label: 'AI',
    title: 'The Architecture Behind Modern LLM Inference',
    author: 'E. Vance',
    time: '11 min',
  },
  {
    label: 'System Design',
    title: 'Zero-Downtime Database Migrations at Scale',
    author: 'A. Krishnan',
    time: '6 min',
  },
  {
    label: 'Editorial',
    title: 'Why Newsrooms Should Own Their Publishing Stack',
    author: 'M. Osei',
    time: '5 min',
  },
];

export const OnboardingPage: React.FC = () => {
  const [selectedTopics, setSelectedTopics] = useState<string[]>([
    'technology',
    'ai',
    'cybersecurity',
  ]);
  const [hoveredTopic, setHoveredTopic] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const { updateUser } = useAuthStore();
  const navigate = useNavigate();

  const toggleTopic = (id: string) => {
    setSelectedTopics((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id],
    );
  };

  const handleContinue = async () => {
    if (selectedTopics.length < 3) return;
    setIsSaving(true);
    try {
      const updated = await apiClient.patch('/auth/me', {
        preferredTopics: selectedTopics,
      });
      if (updated.data?.user) updateUser(updated.data.user);
    } catch {
      // continue regardless
    } finally {
      setIsSaving(false);
      navigate('/dashboard');
    }
  };

  const isReady = selectedTopics.length >= 3;

  // Articles that match selected topics (for right panel preview)
  const previewArticles = PREVIEW_ARTICLES.filter((a) =>
    selectedTopics.some(
      (t) =>
        a.label.toLowerCase().includes(t.split('-')[0]) ||
        t.includes(a.label.toLowerCase()),
    ),
  ).slice(0, 3).concat(PREVIEW_ARTICLES).slice(0, 3);

  const getTopicById = (id: string): Topic | undefined => {
    for (const s of TOPIC_SECTIONS) {
      const found = s.topics.find((t) => t.id === id);
      if (found) return found;
    }
  };

  return (
    <div className="min-h-screen flex font-sans">
      {/* ─── LEFT PANEL — Editorial Topic Selection ─── */}
      <div className="flex-1 flex flex-col min-h-screen bg-canvas-paper overflow-y-auto">
        {/* Top bar */}
        <div className="px-10 pt-8 pb-0 flex items-center justify-between">
          <span className="font-editorial text-sm font-semibold tracking-tight text-ink-primary">
            EditorialHub
          </span>
          <span className="font-mono text-[11px] text-ink-secondary tabular-nums">
            Step 1 of 1
          </span>
        </div>

        {/* Main content */}
        <div className="flex-1 px-10 pt-12 pb-16 max-w-2xl">
          {/* Heading block */}
          <div className="mb-10">
            <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-accent-crimson font-semibold mb-3">
              Personalise your reading desk
            </p>
            <h1 className="font-editorial text-4xl sm:text-5xl font-semibold text-ink-primary leading-[1.1] tracking-tight">
              What should be
              <br />
              on your desk?
            </h1>
            <p className="mt-4 text-sm text-ink-secondary leading-relaxed max-w-sm">
              Select at least 3 topics. Your choices shape the stories that
              reach you — today and every day after.
            </p>
          </div>

          {/* Topic sections */}
          <div className="space-y-0">
            {TOPIC_SECTIONS.map((section, si) => (
              <div key={section.section}>
                {/* Section header with hairline rule */}
                <div className={`flex items-center gap-3 ${si > 0 ? 'mt-8' : ''} mb-4`}>
                  <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-secondary font-semibold whitespace-nowrap">
                    {section.section}
                  </span>
                  <div className="flex-1 h-px bg-border-subtle" />
                </div>

                {/* Topic chips */}
                <div className="flex flex-wrap gap-2">
                  {section.topics.map((topic) => {
                    const isSelected = selectedTopics.includes(topic.id);
                    const isHovered = hoveredTopic === topic.id;

                    return (
                      <button
                        key={topic.id}
                        type="button"
                        onClick={() => toggleTopic(topic.id)}
                        onMouseEnter={() => setHoveredTopic(topic.id)}
                        onMouseLeave={() => setHoveredTopic(null)}
                        className={`
                          relative inline-flex items-center gap-1.5
                          px-3.5 py-1.5
                          text-[13px] font-medium
                          border transition-all duration-150
                          ${
                            isSelected
                              ? 'bg-ink-primary text-white border-ink-primary'
                              : 'bg-transparent text-ink-primary border-border-subtle hover:border-ink-secondary'
                          }
                        `}
                        style={{ borderRadius: 2 }}
                      >
                        <span>{topic.name}</span>
                        {/* Story count tooltip on hover */}
                        {isHovered && !isSelected && (
                          <span className="ml-1 font-mono text-[10px] text-ink-secondary">
                            {topic.count}
                          </span>
                        )}
                        {isSelected && (
                          <span className="font-mono text-[10px] opacity-60">
                            {topic.count}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Bottom action bar */}
          <div className="mt-12 pt-8 border-t border-border-subtle flex items-center justify-between gap-6">
            <div className="space-y-0.5">
              <p className="font-mono text-xs text-ink-secondary">
                <span
                  className={`font-semibold tabular-nums ${
                    isReady ? 'text-ink-primary' : 'text-ink-secondary'
                  }`}
                >
                  {selectedTopics.length}
                </span>{' '}
                selected · minimum 3
              </p>
              {selectedTopics.length > 0 && (
                <p className="text-[11px] font-mono text-ink-secondary truncate max-w-xs">
                  {selectedTopics
                    .slice(0, 3)
                    .map((id) => getTopicById(id)?.name)
                    .filter(Boolean)
                    .join(' · ')}
                  {selectedTopics.length > 3 && ` +${selectedTopics.length - 3} more`}
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={handleContinue}
              disabled={!isReady || isSaving}
              className={`
                inline-flex items-center gap-2
                px-6 py-2.5
                text-sm font-semibold tracking-wide
                transition-all duration-150
                ${
                  isReady && !isSaving
                    ? 'bg-ink-primary text-white hover:bg-slate-800 cursor-pointer'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }
              `}
              style={{ borderRadius: 2 }}
            >
              {isSaving ? (
                <span className="font-mono text-xs">Saving…</span>
              ) : (
                <>
                  <span>Go to my desk</span>
                  <ArrowRight size={14} strokeWidth={2} />
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ─── RIGHT PANEL — Dark Editorial Preview ─── */}
      <div className="hidden lg:flex w-[38%] xl:w-[36%] bg-ink-primary flex-col min-h-screen sticky top-0 overflow-hidden">
        {/* Panel header */}
        <div className="px-8 pt-8 pb-6 border-b border-white/10">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/40 mb-1">
            Your reading desk preview
          </p>
          <p className="font-editorial text-white text-lg font-semibold leading-snug">
            {selectedTopics.length >= 3
              ? `Based on ${selectedTopics.length} topics`
              : 'Select topics to preview'}
          </p>
        </div>

        {/* Preview articles list */}
        <div className="flex-1 px-8 pt-6 space-y-0 overflow-hidden">
          {previewArticles.map((article, idx) => (
            <div
              key={idx}
              className="py-5 border-b border-white/10 group"
              style={{ opacity: 1 - idx * 0.12 }}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="font-mono text-[10px] uppercase tracking-wider text-accent-crimson font-semibold">
                  {article.label}
                </span>
                <span className="text-white/20 font-mono text-[10px]">·</span>
                <span className="font-mono text-[10px] text-white/30">
                  {article.time} read
                </span>
              </div>
              <p className="font-editorial text-white text-base font-semibold leading-snug mb-2">
                {article.title}
              </p>
              <p className="font-mono text-[11px] text-white/30">
                {article.author}
              </p>
            </div>
          ))}

          {/* Fade out at bottom */}
          <div className="pointer-events-none h-32 -mx-8 -mb-6 bg-gradient-to-b from-transparent to-ink-primary" />
        </div>

        {/* Panel footer */}
        <div className="px-8 pb-8 pt-4">
          {/* Selected topic tags */}
          {selectedTopics.length > 0 && (
            <div className="mb-4">
              <p className="font-mono text-[10px] uppercase tracking-wider text-white/30 mb-2">
                Following
              </p>
              <div className="flex flex-wrap gap-1.5">
                {selectedTopics.slice(0, 6).map((id) => {
                  const topic = getTopicById(id);
                  if (!topic) return null;
                  return (
                    <span
                      key={id}
                      className="px-2 py-0.5 border border-white/20 font-mono text-[10px] text-white/50"
                      style={{ borderRadius: 1 }}
                    >
                      {topic.name}
                    </span>
                  );
                })}
                {selectedTopics.length > 6 && (
                  <span className="font-mono text-[10px] text-white/30 self-center">
                    +{selectedTopics.length - 6}
                  </span>
                )}
              </div>
            </div>
          )}

          <p className="font-editorial text-white/20 text-xs italic leading-relaxed">
            "A reading desk shaped by what you care about."
          </p>
        </div>
      </div>
    </div>
  );
};
