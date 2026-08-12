import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  BrainCircuit,
  Check,
  Code2,
  Compass,
  Cpu,
  Layers,
  Palette,
  Scale,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { BrandLogo } from '../../components/common/BrandLogo';
import { useAuthStore } from '../../stores/authStore';

interface TopicOption {
  id: string;
  name: string;
  category: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  description: string;
}

const TOPICS: TopicOption[] = [
  {
    id: 'technology',
    name: 'Technology & Computing',
    category: 'Engineering',
    icon: Cpu,
    description: 'Infrastructure, distributed systems, and operating principles.',
  },
  {
    id: 'ai',
    name: 'Artificial Intelligence',
    category: 'Innovation',
    icon: BrainCircuit,
    description: 'Large language models, neural architectures, and safety alignment.',
  },
  {
    id: 'cybersecurity',
    name: 'Cybersecurity & Privacy',
    category: 'Defense',
    icon: ShieldCheck,
    description: 'Threat models, cryptography, authentication, and vulnerability research.',
  },
  {
    id: 'editorial-design',
    name: 'Editorial Design & Typography',
    category: 'Design',
    icon: Palette,
    description: 'Layout grids, print heritage, typography pairing, and visual balance.',
  },
  {
    id: 'software-architecture',
    name: 'Software Architecture',
    category: 'Engineering',
    icon: Code2,
    description: 'Domain-driven design, transactional patterns, and resilient APIs.',
  },
  {
    id: 'media-culture',
    name: 'Media, Journalism & Culture',
    category: 'Publishing',
    icon: Compass,
    description: 'Investigative reporting, independent journalism, and digital media.',
  },
  {
    id: 'science',
    name: 'Science & Exploration',
    category: 'Discovery',
    icon: Layers,
    description: 'Physics, computational biology, astronomy, and energy research.',
  },
  {
    id: 'policy-governance',
    name: 'Policy & Governance',
    category: 'Society',
    icon: Scale,
    description: 'Open web standards, regulatory frameworks, and tech governance.',
  },
];

export const OnboardingPage: React.FC = () => {
  const [selectedTopics, setSelectedTopics] = useState<string[]>([
    'technology',
    'ai',
    'cybersecurity',
  ]);
  const [isSaving, setIsSaving] = useState(false);

  const { user } = useAuthStore();
  const navigate = useNavigate();

  const toggleTopic = (id: string) => {
    setSelectedTopics((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id],
    );
  };

  const handleContinue = () => {
    if (selectedTopics.length < 3) return;

    setIsSaving(true);
    // Store user topic preferences in localStorage for personalized reader feed
    try {
      localStorage.setItem('user_preferred_topics', JSON.stringify(selectedTopics));
    } catch {
      // Ignore storage errors
    }

    setTimeout(() => {
      setIsSaving(false);
      navigate('/dashboard');
    }, 400);
  };

  const isReady = selectedTopics.length >= 3;

  return (
    <div className="min-h-screen bg-canvas-paper flex flex-col justify-between py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-3xl mx-auto w-full">
        {/* Header */}
        <div className="text-center mb-10">
          <BrandLogo size="lg" showSubtitle />
          <h1 className="mt-8 text-3xl font-editorial font-bold text-ink-primary tracking-tight">
            Personalize your publication feed
          </h1>
          <p className="mt-2 text-sm text-ink-secondary max-w-lg mx-auto">
            {user ? `Welcome, ${user.name}! ` : ''}Select at least 3 topics to customize your
            reading recommendations and author suggestions.
          </p>

          <div className="mt-4 inline-flex items-center gap-2 px-3 py-1 bg-white border border-border-subtle rounded-full text-xs font-mono">
            <Sparkles size={13} className="text-accent-crimson" />
            <span className="text-ink-secondary">Selected:</span>
            <span className="font-semibold text-ink-primary">
              {selectedTopics.length} / 3 minimum
            </span>
          </div>
        </div>

        {/* Topic Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {TOPICS.map((topic) => {
            const isSelected = selectedTopics.includes(topic.id);
            const Icon = topic.icon;

            return (
              <button
                key={topic.id}
                type="button"
                onClick={() => toggleTopic(topic.id)}
                className={`flex items-start gap-4 p-5 rounded-xl border text-left transition-all relative ${
                  isSelected
                    ? 'bg-white border-accent-crimson ring-2 ring-accent-crimson/15 shadow-sm'
                    : 'bg-white/60 border-border-subtle hover:bg-white hover:border-slate-300'
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                    isSelected
                      ? 'bg-accent-crimson text-white'
                      : 'bg-slate-100 text-ink-secondary group-hover:text-ink-primary'
                  }`}
                >
                  <Icon size={20} />
                </div>

                <div className="flex-1 min-w-0 pr-6">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-ink-secondary">
                      {topic.category}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-ink-primary mt-0.5">{topic.name}</h3>
                  <p className="text-xs text-ink-secondary mt-1 leading-relaxed line-clamp-2">
                    {topic.description}
                  </p>
                </div>

                {/* Selection Check Circle */}
                <div
                  className={`absolute right-4 top-4 w-5 h-5 rounded-full flex items-center justify-center border transition-colors ${
                    isSelected
                      ? 'bg-accent-crimson border-accent-crimson text-white'
                      : 'border-slate-300 bg-white'
                  }`}
                >
                  {isSelected && <Check size={12} strokeWidth={3} />}
                </div>
              </button>
            );
          })}
        </div>

        {/* Continue Action Footer */}
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-border-subtle">
          <p className="text-xs text-ink-secondary">
            You can modify your topic preferences at any time in Profile Settings.
          </p>

          <button
            type="button"
            onClick={handleContinue}
            disabled={!isReady || isSaving}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-ink-primary hover:bg-slate-800 text-white rounded-lg text-xs font-semibold tracking-wide transition-all shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <span>Saving preferences...</span>
            ) : (
              <>
                <span>Continue to Dashboard</span>
                <ArrowRight size={14} />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
