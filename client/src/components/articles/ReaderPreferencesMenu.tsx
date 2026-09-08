import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Type, RotateCcw, Sliders, Check, Maximize2, Minimize2 } from 'lucide-react';

export interface ReaderPreferences {
  fontSize: 'small' | 'default' | 'large' | 'xl';
  fontFamily: 'newsreader' | 'jakarta' | 'mono';
  readingWidth: 'standard' | 'wide';
}

export const DEFAULT_READER_PREFS: ReaderPreferences = {
  fontSize: 'default',
  fontFamily: 'newsreader',
  readingWidth: 'standard',
};

const STORAGE_KEY = 'thegazette_reader_prefs_v1';

export function getStoredReaderPrefs(): ReaderPreferences {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? { ...DEFAULT_READER_PREFS, ...JSON.parse(saved) } : DEFAULT_READER_PREFS;
  } catch {
    return DEFAULT_READER_PREFS;
  }
}

export function saveStoredReaderPrefs(prefs: ReaderPreferences): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // ignore
  }
}

export interface ReaderPreferencesMenuProps {
  preferences: ReaderPreferences;
  onPreferencesChange: (newPrefs: ReaderPreferences) => void;
}

export const ReaderPreferencesMenu: React.FC<ReaderPreferencesMenuProps> = ({
  preferences,
  onPreferencesChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const setFontSize = (size: ReaderPreferences['fontSize']) => {
    const updated = { ...preferences, fontSize: size };
    onPreferencesChange(updated);
    saveStoredReaderPrefs(updated);
  };

  const setFontFamily = (family: ReaderPreferences['fontFamily']) => {
    const updated = { ...preferences, fontFamily: family };
    onPreferencesChange(updated);
    saveStoredReaderPrefs(updated);
  };

  const setReadingWidth = (width: ReaderPreferences['readingWidth']) => {
    const updated = { ...preferences, readingWidth: width };
    onPreferencesChange(updated);
    saveStoredReaderPrefs(updated);
  };

  const resetToDefaults = () => {
    onPreferencesChange(DEFAULT_READER_PREFS);
    saveStoredReaderPrefs(DEFAULT_READER_PREFS);
  };

  return (
    <div className="relative inline-block text-left select-none">
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-label="Adjust reading typography and display preferences"
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-medium border border-border-subtle bg-white dark:bg-zinc-900 text-ink-primary hover:border-ink-primary transition-colors shadow-xs"
        style={{ borderRadius: 2 }}
      >
        <Type size={14} className="text-accent-crimson" />
        <span>Typography</span>
      </button>

      {/* Popover Menu */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop Dismiss Target */}
            <div
              className="fixed inset-0 z-30"
              onClick={() => setIsOpen(false)}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -4 }}
              transition={{ type: 'spring', stiffness: 450, damping: 30 }}
              className="absolute right-0 mt-2 w-72 bg-white dark:bg-zinc-950 border border-border-strong shadow-2xl p-4 z-40 space-y-4 text-xs font-sans"
              style={{ borderRadius: 2 }}
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-border-subtle pb-2">
                <span className="text-[10px] font-mono uppercase tracking-wider text-ink-secondary font-bold flex items-center gap-1">
                  <Sliders size={12} /> Reading Comfort
                </span>
                <button
                  type="button"
                  onClick={resetToDefaults}
                  className="text-[10px] font-mono text-accent-crimson hover:underline flex items-center gap-1"
                >
                  <RotateCcw size={10} /> Reset Defaults
                </button>
              </div>

              {/* 1. Typeface Selector */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-mono text-ink-secondary font-semibold">
                  Typeface Mode
                </label>
                <div className="grid grid-cols-3 gap-1 p-0.5 bg-canvas-subtle border border-border-subtle rounded">
                  <button
                    type="button"
                    onClick={() => setFontFamily('newsreader')}
                    className={`py-1.5 px-2 text-center transition-colors font-serif ${
                      preferences.fontFamily === 'newsreader'
                        ? 'bg-white dark:bg-zinc-900 text-ink-primary font-bold shadow-xs'
                        : 'text-ink-secondary hover:text-ink-primary'
                    }`}
                  >
                    Serif
                  </button>

                  <button
                    type="button"
                    onClick={() => setFontFamily('jakarta')}
                    className={`py-1.5 px-2 text-center transition-colors font-sans ${
                      preferences.fontFamily === 'jakarta'
                        ? 'bg-white dark:bg-zinc-900 text-ink-primary font-bold shadow-xs'
                        : 'text-ink-secondary hover:text-ink-primary'
                    }`}
                  >
                    Sans
                  </button>

                  <button
                    type="button"
                    onClick={() => setFontFamily('mono')}
                    className={`py-1.5 px-2 text-center transition-colors font-mono text-[10px] ${
                      preferences.fontFamily === 'mono'
                        ? 'bg-white dark:bg-zinc-900 text-ink-primary font-bold shadow-xs'
                        : 'text-ink-secondary hover:text-ink-primary'
                    }`}
                  >
                    Mono
                  </button>
                </div>
              </div>

              {/* 2. Font Size Scaler */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-mono text-ink-secondary font-semibold">
                  Text Scale
                </label>
                <div className="grid grid-cols-4 gap-1 p-0.5 bg-canvas-subtle border border-border-subtle rounded text-center font-mono">
                  {(['small', 'default', 'large', 'xl'] as const).map((sz) => (
                    <button
                      key={sz}
                      type="button"
                      onClick={() => setFontSize(sz)}
                      className={`py-1 capitalize transition-colors ${
                        preferences.fontSize === sz
                          ? 'bg-white dark:bg-zinc-900 text-accent-crimson font-bold shadow-xs'
                          : 'text-ink-secondary hover:text-ink-primary'
                      }`}
                    >
                      {sz === 'small' ? 'S' : sz === 'default' ? 'M' : sz === 'large' ? 'L' : 'XL'}
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. Column Width */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-mono text-ink-secondary font-semibold">
                  Reading Column
                </label>
                <div className="grid grid-cols-2 gap-1 p-0.5 bg-canvas-subtle border border-border-subtle rounded font-mono text-[11px]">
                  <button
                    type="button"
                    onClick={() => setReadingWidth('standard')}
                    className={`py-1.5 flex items-center justify-center gap-1 transition-colors ${
                      preferences.readingWidth === 'standard'
                        ? 'bg-white dark:bg-zinc-900 text-ink-primary font-bold shadow-xs'
                        : 'text-ink-secondary hover:text-ink-primary'
                    }`}
                  >
                    <Minimize2 size={12} /> Standard
                  </button>

                  <button
                    type="button"
                    onClick={() => setReadingWidth('wide')}
                    className={`py-1.5 flex items-center justify-center gap-1 transition-colors ${
                      preferences.readingWidth === 'wide'
                        ? 'bg-white dark:bg-zinc-900 text-ink-primary font-bold shadow-xs'
                        : 'text-ink-secondary hover:text-ink-primary'
                    }`}
                  >
                    <Maximize2 size={12} /> Expanded
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
