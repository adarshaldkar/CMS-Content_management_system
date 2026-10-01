import React, { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Sparkles,
  Layers,
  Cpu,
  ShieldCheck,
  Globe,
  PenTool,
  Code2,
  Atom,
  TrendingUp,
  BookOpen,
  Check,
  Zap,
  Clock,
  Mail,
  Headphones,
  Sliders,
  Bookmark,
  Newspaper,
  UserCheck,
  ChevronRight,
  Terminal,
  Database,
  Cloud,
  FileText,
  Binary,
  Flame,
  Bot,
  Activity,
  Award,
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { apiClient } from '../../api/client';
import { BrandLogo } from '../../components/common/BrandLogo';

// ─────────────────────────────────────────────────────────────────────────────
// Step 1: Topics Data (Using clean Lucide icons only - no emojis)
// ─────────────────────────────────────────────────────────────────────────────

interface TopicItem {
  id: string;
  name: string;
  count: string;
  icon: React.ElementType;
}

interface TopicGroup {
  section: string;
  icon: React.ElementType;
  topics: TopicItem[];
}

const TOPIC_GROUPS: TopicGroup[] = [
  {
    section: 'Engineering & Infrastructure',
    icon: Cpu,
    topics: [
      { id: 'technology', name: 'Core Technology', count: '312K', icon: Zap },
      { id: 'software-architecture', name: 'Software Architecture', count: '48K', icon: Layers },
      { id: 'cybersecurity', name: 'Cybersecurity & Zero-Trust', count: '91K', icon: ShieldCheck },
      { id: 'cloud-infrastructure', name: 'Cloud & Distributed Systems', count: '76K', icon: Cloud },
      { id: 'devops', name: 'DevOps & Site Reliability', count: '55K', icon: Terminal },
      { id: 'web-development', name: 'Web Standards & Modern JS', count: '204K', icon: Globe },
    ],
  },
  {
    section: 'Artificial Intelligence & Data',
    icon: Sparkles,
    topics: [
      { id: 'ai', name: 'Artificial Intelligence', count: '189K', icon: Bot },
      { id: 'llms', name: 'LLMs & Latent Reasoning', count: '67K', icon: Sparkles },
      { id: 'machine-learning', name: 'ML Systems & Neural Pipelines', count: '143K', icon: Binary },
      { id: 'data-science', name: 'Data Engineering & Analytics', count: '98K', icon: Database },
    ],
  },
  {
    section: 'Programming & System Craft',
    icon: Code2,
    topics: [
      { id: 'python', name: 'Python Ecosystem', count: '221K', icon: Code2 },
      { id: 'javascript', name: 'TypeScript & JavaScript', count: '310K', icon: Code2 },
      { id: 'react', name: 'React & Frontend Runtimes', count: '88K', icon: Atom },
      { id: 'system-design', name: 'High-Scale System Design', count: '52K', icon: Activity },
    ],
  },
  {
    section: 'Editorial, Governance & Markets',
    icon: Newspaper,
    topics: [
      { id: 'editorial-design', name: 'Editorial Design & Layout', count: '22K', icon: PenTool },
      { id: 'typography', name: 'Typography & Readability', count: '18K', icon: FileText },
      { id: 'media-culture', name: 'Investigative Journalism', count: '41K', icon: Newspaper },
      { id: 'policy-governance', name: 'Digital Policy & AI Ethics', count: '33K', icon: ShieldCheck },
      { id: 'money', name: 'Macroeconomics & Liquidity', count: '64K', icon: TrendingUp },
      { id: 'science', name: 'Frontier Science & Research', count: '58K', icon: Atom },
    ],
  },
];

const CURATED_BUNDLES = [
  {
    name: 'Curated Tech Stack',
    desc: 'Architecture, Cloud & Security',
    icon: Cpu,
    topics: ['technology', 'software-architecture', 'cybersecurity', 'cloud-infrastructure'],
  },
  {
    name: 'AI & Data Science',
    desc: 'LLMs, Neural Nets & Analytics',
    icon: Sparkles,
    topics: ['ai', 'llms', 'machine-learning', 'data-science'],
  },
  {
    name: 'Design & Journalism',
    desc: 'Investigative & Typography',
    icon: PenTool,
    topics: ['editorial-design', 'typography', 'media-culture', 'policy-governance'],
  },
  {
    name: 'Systems & Reliability',
    desc: 'DevOps, Scale & Zero-Trust',
    icon: ShieldCheck,
    topics: ['cybersecurity', 'cloud-infrastructure', 'devops', 'system-design'],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Step 2: Reading Cadence & Habits Data
// ─────────────────────────────────────────────────────────────────────────────

const READING_CADENCES = [
  {
    id: 'deep',
    title: 'The Deep Inquirer',
    desc: 'Comprehensive long-form essays, technical whitepapers, and investigative series.',
    timeEstimate: '20–30 min/day',
    icon: BookOpen,
  },
  {
    id: 'balanced',
    title: 'Editorial Balanced',
    desc: 'Curated mix of 5-minute executive summaries and 1 featured deep-dive analysis.',
    timeEstimate: '10–15 min/day',
    icon: Newspaper,
    recommended: true,
  },
  {
    id: 'fast',
    title: 'Executive Briefs',
    desc: 'Bullet point synopses, key takeaways, and metric snapshots for fast scanning.',
    timeEstimate: '5 min/day',
    icon: Zap,
  },
];

const DISPATCH_TIMES = [
  { id: '06:00', label: '06:00 AM', desc: 'Early Bird Dawn Edition' },
  { id: '08:30', label: '08:30 AM', desc: 'Morning Commute Briefing' },
  { id: '12:30', label: '12:30 PM', desc: 'Mid-Day Intelligence Pulse' },
  { id: '18:00', label: '06:00 PM', desc: 'Evening Wrap & Analysis' },
];

// ─────────────────────────────────────────────────────────────────────────────
// Step 3: Featured Voices & Columnists Data
// ─────────────────────────────────────────────────────────────────────────────

const FEATURED_AUTHORS = [
  {
    id: 'sarah-lin',
    name: 'Dr. Sarah Lin',
    role: 'Principal Systems Architect',
    beats: ['Distributed Systems', 'PostgreSQL', 'Consensus'],
    followers: '42.8K',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    verified: true,
  },
  {
    id: 'marcus-vance',
    name: 'Marcus Vance',
    role: 'Senior Security Fellow',
    beats: ['Zero-Trust', 'Kernel Security', 'Cryptography'],
    followers: '29.1K',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    verified: true,
  },
  {
    id: 'elena-rostova',
    name: 'Elena Rostova',
    role: 'Lead AI Research Editor',
    beats: ['Latent Reasoning', 'Foundation Models', 'Mechanistic Interpretability'],
    followers: '56.4K',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    verified: true,
  },
  {
    id: 'david-chen',
    name: 'David K. Chen',
    role: 'Staff Infrastructure Engineer',
    beats: ['Kubernetes', 'eBPF', 'Edge Computing'],
    followers: '31.2K',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    verified: true,
  },
  {
    id: 'clara-montgomery',
    name: 'Clara Montgomery',
    role: 'Editor-at-Large',
    beats: ['Editorial Typography', 'Digital Publishing', 'Media Culture'],
    followers: '19.8K',
    avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
    verified: true,
  },
  {
    id: 'julian-hayes',
    name: 'Prof. Julian Hayes',
    role: 'Scientific Correspondent',
    beats: ['Astrophysics', 'Quantum Computing', 'High Energy Physics'],
    followers: '24.5K',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
    verified: true,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Step 4: AI Intelligence & Synthesis Engine Options
// ─────────────────────────────────────────────────────────────────────────────

const AI_SYNTHESIS_STYLES = [
  {
    id: 'executive',
    title: 'Executive Takeaways & Key Metrics',
    desc: 'Structured bullet points emphasizing business impact, benchmark numbers, and actionable decisions.',
    icon: TrendingUp,
  },
  {
    id: 'scholarly',
    title: 'Scholarly & Technical Deep Dive',
    desc: 'Formal prose with mathematical nuances, algorithmic mechanics, and reference citations.',
    icon: Binary,
  },
  {
    id: 'narrative',
    title: 'Editorial Investigative Narrative',
    desc: 'Engaging, story-driven journalistic cadence focusing on behind-the-scenes contexts and implications.',
    icon: Newspaper,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Live Preview Story Catalog
// ─────────────────────────────────────────────────────────────────────────────

const PREVIEW_STORIES = [
  {
    topicId: 'technology',
    category: 'SYSTEMS ARCHITECTURE',
    title: 'High-Concurrency Database Synchronization: Real-Time Replication Across Multi-Region Clusters',
    author: 'Dr. Sarah Lin',
    time: '7 min read',
    image: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600&auto=format&fit=crop&q=80',
  },
  {
    topicId: 'ai',
    category: 'ARTIFICIAL INTELLIGENCE',
    title: 'The Architecture Behind Modern Large Language Models: Latent Reasoning & Deep Attention',
    author: 'Elena Rostova',
    time: '9 min read',
    image: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=600&auto=format&fit=crop&q=80',
  },
  {
    topicId: 'cybersecurity',
    category: 'CYBERSECURITY',
    title: 'Zero-Trust Engineering in Distributed Systems: Defending Against Token Replay Attacks',
    author: 'Marcus Vance',
    time: '6 min read',
    image: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=600&auto=format&fit=crop&q=80',
  },
  {
    topicId: 'software-architecture',
    category: 'INFRASTRUCTURE',
    title: 'Low-Latency Streaming Pipelines, Stateful Brokers, and Event Mesh Topology',
    author: 'David K. Chen',
    time: '8 min read',
    image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&auto=format&fit=crop&q=80',
  },
  {
    topicId: 'editorial-design',
    category: 'EDITORIAL DESIGN',
    title: 'The Geometry of The Editorial Page: Designing Modern Digital Reading Experiences',
    author: 'Clara Montgomery',
    time: '5 min read',
    image: 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=600&auto=format&fit=crop&q=80',
  },
  {
    topicId: 'science',
    category: 'FRONTIER SCIENCE',
    title: 'Beyond the Event Horizon: Gravitational Wave Astronomy and Cosmic Mapping',
    author: 'Prof. Julian Hayes',
    time: '10 min read',
    image: 'https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=600&auto=format&fit=crop&q=80',
  },
];

export const OnboardingPage: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([
    'technology',
    'ai',
    'cybersecurity',
  ]);
  const [readingCadence, setReadingCadence] = useState<string>('balanced');
  const [dispatchTime, setDispatchTime] = useState<string>('08:30');
  const [audioEnabled, setAudioEnabled] = useState<boolean>(true);
  const [followedAuthors, setFollowedAuthors] = useState<string[]>([
    'sarah-lin',
    'elena-rostova',
  ]);
  const [aiSynthesisStyle, setAiSynthesisStyle] = useState<string>('executive');
  const [enableSmartDigest, setEnableSmartDigest] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const { updateUser } = useAuthStore();
  const navigate = useNavigate();

  // Topic selection helpers
  const toggleTopic = (id: string) => {
    setSelectedTopics((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id],
    );
  };

  const applyBundle = (topics: string[]) => {
    setSelectedTopics((prev) => Array.from(new Set([...prev, ...topics])));
  };

  const toggleAuthor = (id: string) => {
    setFollowedAuthors((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id],
    );
  };

  // Step Validation
  const isStep1Valid = selectedTopics.length >= 3;
  const isStepValid = useMemo(() => {
    if (currentStep === 1) return isStep1Valid;
    if (currentStep === 2) return Boolean(readingCadence && dispatchTime);
    if (currentStep === 3) return followedAuthors.length >= 1;
    if (currentStep === 4) return Boolean(aiSynthesisStyle);
    return true;
  }, [currentStep, isStep1Valid, readingCadence, dispatchTime, followedAuthors, aiSynthesisStyle]);

  // Handle final submission
  const handleFinish = async () => {
    setIsSaving(true);
    try {
      const updated = await apiClient.patch('/auth/me', {
        preferredTopics: selectedTopics,
      });
      if (updated.data?.user) updateUser(updated.data.user);
    } catch {
      // Continue gracefully even if network was offline
    } finally {
      setIsSaving(false);
      navigate('/dashboard');
    }
  };

  const handleNext = () => {
    if (currentStep < 4) {
      setCurrentStep((prev) => prev + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      handleFinish();
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Dynamic preview stories tailored to selected topics
  const livePreviewStories = useMemo(() => {
    const matched = PREVIEW_STORIES.filter((story) => selectedTopics.includes(story.topicId));
    if (matched.length >= 3) return matched.slice(0, 3);
    const remaining = PREVIEW_STORIES.filter((s) => !matched.some((m) => m.title === s.title));
    return [...matched, ...remaining].slice(0, 3);
  }, [selectedTopics]);

  const stepsList = [
    { num: 1, label: 'Interests & Topics', icon: Layers },
    { num: 2, label: 'Reading Cadence', icon: Clock },
    { num: 3, label: 'Featured Voices', icon: UserCheck },
    { num: 4, label: 'AI Intelligence', icon: Sparkles },
  ];

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[#fafaf8] text-ink-primary font-sans antialiased selection:bg-accent-crimson selection:text-white">
      {/* ─── LEFT PANEL — Interactive Multi-Step Curation Flow ─── */}
      <div className="flex-1 flex flex-col min-h-screen pb-32 lg:pb-16">
        {/* Top Header & Breadcrumb Tracker */}
        <header className="px-6 sm:px-10 py-5 border-b border-border-subtle/80 bg-white/80 backdrop-blur-md sticky top-0 z-30 flex items-center justify-between">
          <BrandLogo size="md" showSubtitle />

          {/* Desktop Step Breadcrumbs */}
          <nav className="hidden md:flex items-center gap-1.5 bg-slate-100/80 p-1.5 rounded-full border border-border-subtle">
            {stepsList.map((step) => {
              const StepIcon = step.icon;
              const isActive = currentStep === step.num;
              const isPast = currentStep > step.num;

              return (
                <button
                  key={step.num}
                  type="button"
                  onClick={() => {
                    if (isPast || (step.num === 1 && isStep1Valid)) {
                      setCurrentStep(step.num);
                    }
                  }}
                  disabled={!isPast && step.num !== currentStep}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-medium transition-all ${
                    isActive
                      ? 'bg-ink-primary text-white shadow-xs'
                      : isPast
                      ? 'bg-white text-emerald-700 hover:bg-emerald-50 cursor-pointer'
                      : 'text-ink-muted cursor-not-allowed opacity-60'
                  }`}
                >
                  {isPast ? (
                    <CheckCircle2 size={12} className="text-emerald-500 stroke-[2.5]" />
                  ) : (
                    <StepIcon size={12} />
                  )}
                  <span>{step.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="flex items-center gap-3">
            <span className="md:hidden text-xs font-mono font-bold text-ink-secondary bg-slate-100 px-2.5 py-1 rounded-md">
              Step {currentStep}/4
            </span>
            <Link
              to="/dashboard"
              className="text-xs font-serif text-ink-secondary hover:text-accent-crimson transition-colors underline-offset-4 hover:underline"
            >
              Skip &rarr;
            </Link>
          </div>
        </header>

        {/* Step Container Area */}
        <main className="flex-1 px-6 sm:px-10 lg:px-12 pt-8 sm:pt-10 max-w-3xl mx-auto w-full">
          {/* ════════════════════════════════════════════════════════════════
              STEP 1: TOPICS & DESK PERSPECTIVES
          ════════════════════════════════════════════════════════════════ */}
          {currentStep === 1 && (
            <div className="space-y-8 animate-in fade-in duration-300">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-accent-crimson/10 text-accent-crimson rounded-full text-[11px] font-mono font-bold tracking-wider uppercase mb-3">
                  <Layers size={13} />
                  <span>Step 1 of 4 &middot; Reading Desk Curation</span>
                </div>

                <h1 className="font-editorial text-3xl sm:text-4xl lg:text-5xl font-bold text-ink-primary tracking-tight leading-[1.15]">
                  What perspectives should arrive at your desk?
                </h1>

                <p className="mt-3 text-sm sm:text-base text-ink-secondary leading-relaxed max-w-xl font-serif">
                  Select <span className="font-semibold text-ink-primary">at least 3 topics</span>. The Gazette algorithms and newsroom editors will curate your morning briefs and live intelligence feeds based on these choices.
                </p>
              </div>

              {/* Curated Bundles */}
              <div className="p-4 sm:p-5 bg-white border border-border-subtle rounded-2xl shadow-xs">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-mono uppercase tracking-widest text-ink-muted font-semibold flex items-center gap-1.5">
                    <Zap size={14} className="text-amber-500" />
                    <span>1-Click Curated Bundles</span>
                  </span>
                  <span className="text-[11px] font-mono text-ink-muted">Quick Setup</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                  {CURATED_BUNDLES.map((bundle) => {
                    const BundleIcon = bundle.icon;
                    return (
                      <button
                        key={bundle.name}
                        type="button"
                        onClick={() => applyBundle(bundle.topics)}
                        className="flex items-start gap-3 p-3 rounded-xl border border-border-subtle bg-slate-50/70 hover:bg-amber-50/70 hover:border-amber-300 transition-all text-left group cursor-pointer"
                      >
                        <div className="p-2 rounded-lg bg-white border border-border-subtle text-ink-secondary group-hover:text-accent-crimson group-hover:border-accent-crimson/30 transition-colors shrink-0">
                          <BundleIcon size={16} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-ink-primary group-hover:text-accent-crimson truncate">
                            {bundle.name}
                          </p>
                          <p className="text-[11px] font-serif text-ink-muted line-clamp-1">
                            {bundle.desc}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Topic Category Groups */}
              <div className="space-y-8">
                {TOPIC_GROUPS.map((group) => {
                  const GroupIcon = group.icon;
                  return (
                    <section key={group.section} className="space-y-3">
                      <div className="flex items-center gap-2 pb-2 border-b border-border-subtle">
                        <GroupIcon className="w-4 h-4 text-accent-crimson" />
                        <h2 className="font-mono text-xs uppercase tracking-widest font-bold text-ink-primary">
                          {group.section}
                        </h2>
                      </div>

                      <div className="flex flex-wrap gap-2.5">
                        {group.topics.map((topic) => {
                          const isSelected = selectedTopics.includes(topic.id);
                          const TopicIcon = topic.icon;

                          return (
                            <button
                              key={topic.id}
                              type="button"
                              onClick={() => toggleTopic(topic.id)}
                              className={`
                                group relative inline-flex items-center gap-2.5
                                px-4 py-2.5 rounded-xl text-xs sm:text-[13px] font-medium
                                border transition-all duration-200 cursor-pointer select-none
                                ${
                                  isSelected
                                    ? 'bg-ink-primary text-white border-ink-primary shadow-md ring-2 ring-accent-crimson/40 scale-[1.01]'
                                    : 'bg-white text-ink-primary border-border-subtle hover:border-ink-secondary hover:bg-slate-50 shadow-2xs hover:scale-[1.01]'
                                }
                              `}
                            >
                              <TopicIcon
                                size={14}
                                className={isSelected ? 'text-accent-crimson-hover' : 'text-ink-muted group-hover:text-ink-primary'}
                              />
                              <span className="font-serif font-semibold">{topic.name}</span>

                              <span
                                className={`text-[10px] font-mono px-1.5 py-0.5 rounded-md transition-colors ${
                                  isSelected
                                    ? 'bg-white/20 text-white font-bold'
                                    : 'bg-slate-100 text-ink-muted group-hover:bg-slate-200'
                                }`}
                              >
                                {topic.count}
                              </span>

                              {isSelected && (
                                <Check size={13} className="text-emerald-400 stroke-[3] ml-0.5 animate-in zoom-in-50" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </section>
                  );
                })}
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════════
              STEP 2: READING HABITS & CADENCE
          ════════════════════════════════════════════════════════════════ */}
          {currentStep === 2 && (
            <div className="space-y-8 animate-in fade-in duration-300">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 text-amber-800 rounded-full text-[11px] font-mono font-bold tracking-wider uppercase mb-3">
                  <Clock size={13} />
                  <span>Step 2 of 4 &middot; Reading Habits & Dispatch Rhythm</span>
                </div>

                <h1 className="font-editorial text-3xl sm:text-4xl lg:text-5xl font-bold text-ink-primary tracking-tight leading-[1.15]">
                  How do you prefer to consume journalism?
                </h1>

                <p className="mt-3 text-sm sm:text-base text-ink-secondary leading-relaxed max-w-xl font-serif">
                  Customize the depth, scheduling, and format of your reading feed. You can change these preferences at any time from your settings.
                </p>
              </div>

              {/* Cadence Selection Cards */}
              <div className="space-y-3">
                <label className="block text-xs font-mono uppercase tracking-widest text-ink-muted font-bold">
                  Editorial Depth Preference
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {READING_CADENCES.map((cadence) => {
                    const isSelected = readingCadence === cadence.id;
                    const CadenceIcon = cadence.icon;

                    return (
                      <button
                        key={cadence.id}
                        type="button"
                        onClick={() => setReadingCadence(cadence.id)}
                        className={`relative p-5 rounded-2xl border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? 'bg-white border-accent-crimson ring-2 ring-accent-crimson/20 shadow-md'
                            : 'bg-white/70 border-border-subtle hover:border-slate-300 hover:bg-white'
                        }`}
                      >
                        {cadence.recommended && (
                          <span className="absolute top-3 right-3 text-[9px] font-mono font-bold bg-accent-crimson/10 text-accent-crimson uppercase tracking-widest px-2 py-0.5 rounded-full">
                            Popular
                          </span>
                        )}

                        <div>
                          <div className={`p-2.5 rounded-xl w-fit mb-3 border ${
                            isSelected ? 'bg-accent-crimson/10 border-accent-crimson/30 text-accent-crimson' : 'bg-slate-100 border-border-subtle text-ink-secondary'
                          }`}>
                            <CadenceIcon size={20} />
                          </div>
                          <h3 className="font-serif font-bold text-base text-ink-primary mb-1">
                            {cadence.title}
                          </h3>
                          <p className="text-xs font-serif text-ink-secondary leading-relaxed">
                            {cadence.desc}
                          </p>
                        </div>

                        <div className="mt-4 pt-3 border-t border-border-subtle flex items-center justify-between text-[11px] font-mono">
                          <span className="text-ink-muted">Time Required</span>
                          <span className="font-bold text-ink-primary">{cadence.timeEstimate}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Dispatch Times */}
              <div className="p-6 bg-white border border-border-subtle rounded-2xl shadow-xs space-y-4">
                <div>
                  <label className="block text-xs font-mono uppercase tracking-widest text-ink-muted font-bold mb-1">
                    Morning Briefing Delivery Time
                  </label>
                  <p className="text-xs font-serif text-ink-secondary">
                    Your customized edition is compiled dynamically 10 minutes prior to delivery.
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {DISPATCH_TIMES.map((time) => {
                    const isSelected = dispatchTime === time.id;
                    return (
                      <button
                        key={time.id}
                        type="button"
                        onClick={() => setDispatchTime(time.id)}
                        className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-ink-primary text-white border-ink-primary shadow-xs'
                            : 'bg-slate-50 border-border-subtle text-ink-primary hover:bg-slate-100'
                        }`}
                      >
                        <div className="font-mono text-sm font-bold">{time.label}</div>
                        <div className={`text-[10px] font-serif truncate mt-0.5 ${
                          isSelected ? 'text-slate-300' : 'text-ink-muted'
                        }`}>
                          {time.desc}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Audio & Accessibility Toggle */}
              <div className="p-5 bg-white border border-border-subtle rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-slate-100 border border-border-subtle text-ink-secondary">
                    <Headphones size={20} />
                  </div>
                  <div>
                    <h4 className="font-serif font-bold text-sm text-ink-primary">
                      Synthesized Audio Narration (11Labs HD)
                    </h4>
                    <p className="text-xs font-serif text-ink-secondary">
                      Automatically generate high-fidelity audio narration on long-form investigations.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setAudioEnabled(!audioEnabled)}
                  className={`w-12 h-6 flex items-center rounded-full p-1 duration-300 cursor-pointer ${
                    audioEnabled ? 'bg-accent-crimson' : 'bg-slate-300'
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform duration-300 ${
                      audioEnabled ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════════
              STEP 3: FEATURED VOICES & REPORTERS
          ════════════════════════════════════════════════════════════════ */}
          {currentStep === 3 && (
            <div className="space-y-8 animate-in fade-in duration-300">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-500/10 text-blue-800 rounded-full text-[11px] font-mono font-bold tracking-wider uppercase mb-3">
                  <UserCheck size={13} />
                  <span>Step 3 of 4 &middot; Newsroom Voices & Columnists</span>
                </div>

                <h1 className="font-editorial text-3xl sm:text-4xl lg:text-5xl font-bold text-ink-primary tracking-tight leading-[1.15]">
                  Follow recognized journalists & researchers
                </h1>

                <p className="mt-3 text-sm sm:text-base text-ink-secondary leading-relaxed max-w-xl font-serif">
                  Follow leading voices to receive immediate notifications when they release exclusive investigative reports, data models, or breaking dispatches.
                </p>
              </div>

              {/* Author Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {FEATURED_AUTHORS.map((author) => {
                  const isFollowing = followedAuthors.includes(author.id);

                  return (
                    <div
                      key={author.id}
                      className={`p-4 rounded-2xl border transition-all duration-200 flex items-start gap-3.5 ${
                        isFollowing
                          ? 'bg-white border-accent-crimson/40 shadow-xs ring-1 ring-accent-crimson/20'
                          : 'bg-white/70 border-border-subtle hover:bg-white hover:border-slate-300'
                      }`}
                    >
                      <img
                        src={author.avatar}
                        alt={author.name}
                        className="w-12 h-12 rounded-full object-cover border border-border-subtle shrink-0"
                      />

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <h3 className="font-serif font-bold text-sm text-ink-primary truncate">
                            {author.name}
                          </h3>
                          <button
                            type="button"
                            onClick={() => toggleAuthor(author.id)}
                            className={`px-2.5 py-1 rounded-full text-[11px] font-mono font-bold transition-all cursor-pointer ${
                              isFollowing
                                ? 'bg-ink-primary text-white hover:bg-accent-crimson'
                                : 'bg-slate-100 text-ink-primary hover:bg-slate-200 border border-border-subtle'
                            }`}
                          >
                            {isFollowing ? 'Following' : '+ Follow'}
                          </button>
                        </div>

                        <p className="text-[11px] font-mono text-accent-crimson font-medium">
                          {author.role}
                        </p>

                        <div className="flex flex-wrap gap-1 mt-2">
                          {author.beats.map((beat) => (
                            <span
                              key={beat}
                              className="text-[10px] font-mono bg-slate-100 text-ink-secondary px-1.5 py-0.5 rounded"
                            >
                              {beat}
                            </span>
                          ))}
                        </div>

                        <p className="text-[10px] font-mono text-ink-muted mt-2">
                          {author.followers} readers subscribed
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════════
              STEP 4: AI INTELLIGENCE & SUMMARY PREFERENCES
          ════════════════════════════════════════════════════════════════ */}
          {currentStep === 4 && (
            <div className="space-y-8 animate-in fade-in duration-300">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-500/10 text-purple-800 rounded-full text-[11px] font-mono font-bold tracking-wider uppercase mb-3">
                  <Sparkles size={13} />
                  <span>Step 4 of 4 &middot; Gazette Intelligence Engine</span>
                </div>

                <h1 className="font-editorial text-3xl sm:text-4xl lg:text-5xl font-bold text-ink-primary tracking-tight leading-[1.15]">
                  Fine-tune your AI editorial assistant
                </h1>

                <p className="mt-3 text-sm sm:text-base text-ink-secondary leading-relaxed max-w-xl font-serif">
                  Gazette features built-in neural synthesis that generates executive TL;DRs, contextual footnotes, and cross-source verification notes.
                </p>
              </div>

              {/* Synthesis Style Options */}
              <div className="space-y-3">
                <label className="block text-xs font-mono uppercase tracking-widest text-ink-muted font-bold">
                  AI Summary Style
                </label>
                <div className="space-y-2.5">
                  {AI_SYNTHESIS_STYLES.map((style) => {
                    const isSelected = aiSynthesisStyle === style.id;
                    const StyleIcon = style.icon;

                    return (
                      <button
                        key={style.id}
                        type="button"
                        onClick={() => setAiSynthesisStyle(style.id)}
                        className={`w-full p-4 rounded-2xl border text-left transition-all duration-200 cursor-pointer flex items-start gap-4 ${
                          isSelected
                            ? 'bg-white border-accent-crimson ring-2 ring-accent-crimson/20 shadow-xs'
                            : 'bg-white/70 border-border-subtle hover:bg-white hover:border-slate-300'
                        }`}
                      >
                        <div className={`p-2.5 rounded-xl border shrink-0 ${
                          isSelected ? 'bg-accent-crimson text-white border-accent-crimson' : 'bg-slate-100 border-border-subtle text-ink-secondary'
                        }`}>
                          <StyleIcon size={18} />
                        </div>

                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <h3 className="font-serif font-bold text-sm sm:text-base text-ink-primary">
                              {style.title}
                            </h3>
                            {isSelected && (
                              <span className="text-xs font-mono font-bold text-accent-crimson flex items-center gap-1">
                                <Check size={14} /> Active
                              </span>
                            )}
                          </div>
                          <p className="text-xs font-serif text-ink-secondary mt-1 leading-relaxed">
                            {style.desc}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Automatic Cross-Referencing & Fact-Checking Toggle */}
              <div className="p-5 bg-white border border-border-subtle rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-slate-100 border border-border-subtle text-ink-secondary">
                    <ShieldCheck size={20} />
                  </div>
                  <div>
                    <h4 className="font-serif font-bold text-sm text-ink-primary">
                      Real-Time Source Verification & Claims Graph
                    </h4>
                    <p className="text-xs font-serif text-ink-secondary">
                      Highlight verified datasets, SEC filings, and research papers inline.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setEnableSmartDigest(!enableSmartDigest)}
                  className={`w-12 h-6 flex items-center rounded-full p-1 duration-300 cursor-pointer ${
                    enableSmartDigest ? 'bg-accent-crimson' : 'bg-slate-300'
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform duration-300 ${
                      enableSmartDigest ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          )}
        </main>

        {/* ─── STICKY BOTTOM ACTION DOCK ─── */}
        <div className="fixed bottom-0 left-0 right-0 lg:right-[38%] xl:right-[36%] z-40 p-4 sm:p-5 bg-white/95 backdrop-blur-md border-t border-border-subtle shadow-lg">
          <div className="max-w-3xl mx-auto flex items-center justify-between gap-4">
            {/* Back Button */}
            {currentStep > 1 ? (
              <button
                type="button"
                onClick={handleBack}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-ink-primary hover:bg-slate-100 transition-colors border border-border-subtle cursor-pointer"
              >
                <ArrowLeft size={16} />
                <span>Back</span>
              </button>
            ) : (
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-20 sm:w-28 h-2 bg-slate-100 rounded-full overflow-hidden border border-border-subtle">
                    <div
                      className={`h-full transition-all duration-300 rounded-full ${
                        isStep1Valid ? 'bg-emerald-500' : 'bg-accent-crimson'
                      }`}
                      style={{ width: `${Math.min(100, Math.round((selectedTopics.length / 3) * 100))}%` }}
                    />
                  </div>
                  <span className="text-xs font-mono font-bold text-ink-primary tabular-nums">
                    {selectedTopics.length}/3
                  </span>
                </div>
                <p className="text-[10px] font-serif text-ink-secondary hidden sm:block">
                  {isStep1Valid ? 'Topics ready' : 'Pick at least 3 topics'}
                </p>
              </div>
            )}

            {/* Next / Complete Button */}
            <button
              type="button"
              onClick={handleNext}
              disabled={!isStepValid || isSaving}
              className={`
                inline-flex items-center gap-2 px-6 sm:px-8 py-3 rounded-xl
                text-xs sm:text-sm font-semibold tracking-wide font-serif
                transition-all duration-200 shadow-md cursor-pointer
                ${
                  isStepValid && !isSaving
                    ? 'bg-accent-crimson hover:bg-accent-crimson-hover text-white hover:shadow-lg hover:scale-[1.01] active:scale-[0.99]'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                }
              `}
            >
              {isSaving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  <span>Configuring Desk…</span>
                </>
              ) : currentStep === 4 ? (
                <>
                  <span>Complete Setup & Open Desk</span>
                  <ArrowRight size={16} strokeWidth={2.2} />
                </>
              ) : (
                <>
                  <span>Continue to Step {currentStep + 1}</span>
                  <ChevronRight size={16} strokeWidth={2.2} />
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ─── RIGHT PANEL — Dynamic Live Reading Desk Preview ─── */}
      <aside className="hidden lg:flex w-[38%] xl:w-[36%] bg-slate-950 text-white flex-col min-h-screen sticky top-0 overflow-y-auto border-l border-slate-800 selection:bg-amber-500 selection:text-black">
        {/* Desk Header */}
        <div className="p-8 pb-6 border-b border-slate-800/80 bg-slate-900/50 backdrop-blur-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-amber-400 font-bold flex items-center gap-1.5">
              <Layers size={12} />
              <span>Real-Time Desk Intelligence</span>
            </span>
            <span className="px-2 py-0.5 bg-slate-800 text-slate-300 rounded text-[10px] font-mono">
              Live Compiler
            </span>
          </div>

          <h3 className="font-editorial text-xl font-bold text-white leading-tight">
            {currentStep === 1 && `Curating for ${selectedTopics.length} topic streams`}
            {currentStep === 2 && `Daily Dispatch set for ${dispatchTime}`}
            {currentStep === 3 && `${followedAuthors.length} Newsroom Voices Subscribed`}
            {currentStep === 4 && `AI Synthesis Engine: ${aiSynthesisStyle.toUpperCase()}`}
          </h3>

          <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-slate-800 text-center">
            <div className="p-2 bg-slate-900/80 rounded-lg border border-slate-800">
              <div className="text-base font-bold font-mono text-emerald-400">{selectedTopics.length}</div>
              <div className="text-[9px] font-mono uppercase text-slate-400">Streams</div>
            </div>
            <div className="p-2 bg-slate-900/80 rounded-lg border border-slate-800">
              <div className="text-base font-bold font-mono text-amber-400">{followedAuthors.length}</div>
              <div className="text-[9px] font-mono uppercase text-slate-400">Voices</div>
            </div>
            <div className="p-2 bg-slate-900/80 rounded-lg border border-slate-800">
              <div className="text-base font-bold font-mono text-blue-400">99.8%</div>
              <div className="text-[9px] font-mono uppercase text-slate-400">Precision</div>
            </div>
          </div>
        </div>

        {/* Dynamic Contextual Preview Area */}
        <div className="flex-1 p-6 space-y-4">
          {/* Step 1 & Default: Live Stories Preview */}
          {currentStep === 1 && (
            <>
              <div className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-semibold mb-1 flex items-center gap-1.5">
                <BookOpen size={12} className="text-accent-crimson" />
                <span>Tailored Incoming Dispatches</span>
              </div>

              {livePreviewStories.map((story) => (
                <article
                  key={story.title}
                  className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 hover:border-slate-700 transition-all duration-300 space-y-3 group"
                >
                  <div className="relative aspect-[16/9] rounded-lg overflow-hidden bg-slate-800">
                    <img
                      src={story.image}
                      alt={story.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90 group-hover:opacity-100"
                      loading="lazy"
                    />
                    <span className="absolute top-2 left-2 bg-black/75 backdrop-blur-xs text-white text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded">
                      {story.category}
                    </span>
                  </div>

                  <div>
                    <h4 className="font-editorial text-sm font-bold text-white group-hover:text-amber-400 transition-colors leading-snug line-clamp-2">
                      {story.title}
                    </h4>

                    <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mt-2 pt-2 border-t border-slate-800/60">
                      <span className="text-slate-300 font-medium">{story.author}</span>
                      <span>{story.time}</span>
                    </div>
                  </div>
                </article>
              ))}
            </>
          )}

          {/* Step 2 Preview: Daily Cadence Mockup */}
          {currentStep === 2 && (
            <div className="space-y-4 animate-in fade-in duration-300">
              <div className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-semibold mb-1 flex items-center gap-1.5">
                <Clock size={12} className="text-amber-400" />
                <span>Simulated Daily Morning Briefing</span>
              </div>

              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between text-xs font-mono text-amber-400">
                  <span>DISPATCH AT {dispatchTime}</span>
                  <span className="text-slate-400">Audio Ready</span>
                </div>
                <h4 className="font-editorial text-base font-bold text-white">
                  The Morning Gazette: Global System Architectures & Neural Latents
                </h4>
                <p className="text-xs font-serif text-slate-300 leading-relaxed">
                  Tailored specifically to your reading depth ({readingCadence.toUpperCase()}) with ~12 curated briefs across your {selectedTopics.length} selected topic streams.
                </p>

                {audioEnabled && (
                  <div className="flex items-center gap-3 p-3 bg-slate-800/80 rounded-xl border border-slate-700/60">
                    <Headphones size={16} className="text-emerald-400" />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-serif font-bold text-white">Audio Briefing (11m 40s)</div>
                      <div className="text-[10px] font-mono text-slate-400">11Labs Studio Master</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 3 Preview: Followed Voices Feed */}
          {currentStep === 3 && (
            <div className="space-y-4 animate-in fade-in duration-300">
              <div className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-semibold mb-1 flex items-center gap-1.5">
                <UserCheck size={12} className="text-blue-400" />
                <span>Your Subscribed Journalists ({followedAuthors.length})</span>
              </div>

              {FEATURED_AUTHORS.filter((a) => followedAuthors.includes(a.id)).map((author) => (
                <div
                  key={author.id}
                  className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-3"
                >
                  <img
                    src={author.avatar}
                    alt={author.name}
                    className="w-10 h-10 rounded-full object-cover border border-slate-700"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="font-serif font-bold text-xs text-white truncate">{author.name}</div>
                    <div className="text-[10px] font-mono text-slate-400 truncate">{author.role}</div>
                  </div>
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/40">
                    Priority Alerts
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Step 4 Preview: Neural AI Synthesis Preview */}
          {currentStep === 4 && (
            <div className="space-y-4 animate-in fade-in duration-300">
              <div className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-semibold mb-1 flex items-center gap-1.5">
                <Sparkles size={12} className="text-purple-400" />
                <span>Live AI Synthesis Engine Output</span>
              </div>

              <div className="p-5 rounded-2xl bg-slate-900 border border-purple-900/40 space-y-3">
                <div className="flex items-center justify-between text-xs font-mono text-purple-400">
                  <span className="flex items-center gap-1">
                    <Sparkles size={12} />
                    <span>SYNTHESIS: {aiSynthesisStyle.toUpperCase()}</span>
                  </span>
                  <span className="text-emerald-400">Verified</span>
                </div>

                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs font-mono text-slate-300 space-y-2">
                  <div className="text-amber-400 font-bold">&gt; Key Executive Synthesis</div>
                  <div className="pl-2 border-l border-amber-500/40 text-slate-300 space-y-1">
                    <p>&bull; 4.2x throughput gain observed across distributed raft cluster.</p>
                    <p>&bull; Zero latency penalty with eBPF filter injection at kernel layer.</p>
                    <p>&bull; Multi-region consensus finalized under 14ms.</p>
                  </div>
                </div>

                {enableSmartDigest && (
                  <div className="flex items-center gap-2 text-[10px] font-mono text-emerald-400 bg-emerald-950/40 p-2 rounded-lg border border-emerald-900/50">
                    <ShieldCheck size={14} />
                    <span>3 Citations cross-referenced with IEEE & ACM Digital Library</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Desk Footer */}
        <div className="p-6 border-t border-slate-800/80 bg-slate-900/30">
          <p className="font-editorial text-slate-400 text-xs italic text-center leading-relaxed">
            "Journalism crafted for deep inquiry, uninterrupted reading, and editorial precision."
          </p>
        </div>
      </aside>
    </div>
  );
};
