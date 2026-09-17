import React, { useState, useEffect } from 'react';
import { Cookie, Shield, Check, X, Sliders, ChevronRight } from 'lucide-react';

interface CookiePreferences extends Record<string, boolean> {
  strictlyNecessary: boolean;
  analytics: boolean;
  functional: boolean;
  marketing: boolean;
}

export const CookieConsentBanner: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [showPreferencesModal, setShowPreferencesModal] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences>({
    strictlyNecessary: true,
    analytics: true,
    functional: true,
    marketing: false,
  });

  useEffect(() => {
    const savedConsent = localStorage.getItem('gazette_cookie_consent_v1');
    if (!savedConsent) {
      // Delay display slightly for smooth page entry
      const timer = setTimeout(() => setIsOpen(true), 800);
      return () => clearTimeout(timer);
    }
  }, []);

  const recordConsent = async (choice: 'accepted' | 'rejected' | 'customized', categories: Record<string, boolean>) => {
    try {
      await fetch('/api/legal/consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          consentType: 'cookie_policy',
          version: '1.0',
          choice,
          categories,
        }),
      });
    } catch {
      // Offline / non-blocking fallback
    }

    localStorage.setItem(
      'gazette_cookie_consent_v1',
      JSON.stringify({
        choice,
        categories,
        timestamp: new Date().toISOString(),
      })
    );
    setIsOpen(false);
    setShowPreferencesModal(false);
  };

  const handleAcceptAll = () => {
    const allAccepted = {
      strictlyNecessary: true,
      analytics: true,
      functional: true,
      marketing: true,
    };
    recordConsent('accepted', allAccepted);
  };

  const handleRejectOptional = () => {
    const minimal = {
      strictlyNecessary: true,
      analytics: false,
      functional: false,
      marketing: false,
    };
    recordConsent('rejected', minimal);
  };

  const handleSavePreferences = () => {
    recordConsent('customized', preferences);
  };

  if (!isOpen && !showPreferencesModal) return null;

  return (
    <>
      {/* Floating Bottom Banner */}
      {isOpen && !showPreferencesModal && (
        <aside
          aria-label="Cookie consent"
          className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:max-w-xl z-50 animate-in fade-in slide-in-from-bottom-6 duration-300"
        >
          <div className="rounded-2xl border border-neutral-200/80 dark:border-neutral-800/90 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md p-5 shadow-2xl">
            <div className="flex items-start gap-4">
              <div className="rounded-xl bg-amber-500/10 p-2.5 text-amber-600 dark:text-amber-400 shrink-0">
                <Cookie className="h-6 w-6" />
              </div>
              <div className="flex-1 space-y-1.5">
                <h2 className="text-sm font-semibold tracking-tight text-neutral-900 dark:text-neutral-100 font-serif">
                  Privacy & Cookie Choices
                </h2>
                <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                  The Gazette uses essential cookies to operate and optional cookies to analyze traffic and tailor editorial recommendations. You are in complete control of your privacy.
                </p>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-neutral-100 dark:border-neutral-800/60 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowPreferencesModal(true)}
                className="px-3.5 py-2 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors flex items-center justify-center gap-1.5"
              >
                <Sliders className="h-3.5 w-3.5" />
                <span>Preferences</span>
              </button>
              <button
                type="button"
                onClick={handleRejectOptional}
                className="px-4 py-2 text-xs font-medium text-neutral-700 dark:text-neutral-300 border border-neutral-300 dark:border-neutral-700 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              >
                Reject Optional
              </button>
              <button
                type="button"
                onClick={handleAcceptAll}
                className="px-4 py-2 text-xs font-medium text-white bg-neutral-900 dark:bg-white dark:text-neutral-950 rounded-lg hover:bg-neutral-800 dark:hover:bg-neutral-100 shadow-sm transition-colors"
              >
                Accept All
              </button>
            </div>
          </div>
        </aside>
      )}

      {/* Granular Preferences Modal */}
      {showPreferencesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-2xl p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
              <div className="flex items-center gap-2.5">
                <Shield className="h-5 w-5 text-amber-500" />
                <h2 className="text-base font-semibold text-neutral-900 dark:text-white font-serif">
                  Privacy Preference Center
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowPreferencesModal(false)}
                className="p-1 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-neutral-600 dark:text-neutral-400">
              Customize your consent for specific categories of cookies below. Strictly necessary cookies cannot be disabled as they are required for core security and navigation.
            </p>

            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {/* Strictly Necessary */}
              <div className="p-3 rounded-xl border border-neutral-200/80 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/40 flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="text-xs font-semibold text-neutral-900 dark:text-white flex items-center gap-1.5">
                    Strictly Necessary
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium">
                      Always Active
                    </span>
                  </span>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                    Essential for secure authentication, CSRF defense, and session persistence.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={true}
                  disabled
                  className="h-4 w-4 rounded accent-amber-500 cursor-not-allowed opacity-60"
                />
              </div>

              {/* Analytics */}
              <label className="p-3 rounded-xl border border-neutral-200/80 dark:border-neutral-800 bg-white dark:bg-neutral-800/20 flex items-center justify-between cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800/40 transition-colors">
                <div className="space-y-0.5 pr-3">
                  <span className="text-xs font-semibold text-neutral-900 dark:text-white">
                    Analytics & Performance
                  </span>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                    Measures reader traffic, scroll depth, and page performance to improve Gazette editorial coverage.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.analytics}
                  onChange={(e) =>
                    setPreferences({ ...preferences, analytics: e.target.checked })
                  }
                  className="h-4 w-4 rounded accent-amber-500 cursor-pointer"
                />
              </label>

              {/* Functional */}
              <label className="p-3 rounded-xl border border-neutral-200/80 dark:border-neutral-800 bg-white dark:bg-neutral-800/20 flex items-center justify-between cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800/40 transition-colors">
                <div className="space-y-0.5 pr-3">
                  <span className="text-xs font-semibold text-neutral-900 dark:text-white">
                    Functional & Typography Preferences
                  </span>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                    Remembers your chosen reading layout, font sizing, and dark/light mode toggles across sessions.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.functional}
                  onChange={(e) =>
                    setPreferences({ ...preferences, functional: e.target.checked })
                  }
                  className="h-4 w-4 rounded accent-amber-500 cursor-pointer"
                />
              </label>

              {/* Marketing */}
              <label className="p-3 rounded-xl border border-neutral-200/80 dark:border-neutral-800 bg-white dark:bg-neutral-800/20 flex items-center justify-between cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800/40 transition-colors">
                <div className="space-y-0.5 pr-3">
                  <span className="text-xs font-semibold text-neutral-900 dark:text-white">
                    Personalized Recommendations
                  </span>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                    Allows topic curation based on your reading history and newsletter subscriptions.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.marketing}
                  onChange={(e) =>
                    setPreferences({ ...preferences, marketing: e.target.checked })
                  }
                  className="h-4 w-4 rounded accent-amber-500 cursor-pointer"
                />
              </label>
            </div>

            <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={handleRejectOptional}
                className="px-4 py-2 text-xs font-medium text-neutral-700 dark:text-neutral-300 border border-neutral-300 dark:border-neutral-700 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              >
                Reject All Optional
              </button>
              <button
                type="button"
                onClick={handleSavePreferences}
                className="px-4 py-2 text-xs font-medium text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-sm transition-colors"
              >
                Save My Preferences
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
