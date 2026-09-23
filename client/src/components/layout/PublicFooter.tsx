import React from 'react';
import { Link } from 'react-router-dom';
import { BrandLogo } from '../common/BrandLogo';

const SOCIAL_LINKS = [
  { label: 'GitHub', href: 'https://github.com', symbol: 'github-icon' },
  { label: 'Bluesky', href: 'https://bsky.app', symbol: 'bluesky-icon' },
  { label: 'X', href: 'https://x.com', symbol: 'x-icon' },
  { label: 'Discord', href: 'https://discord.com', symbol: 'discord-icon' },
];

export const PublicFooter: React.FC = () => {
  return (
    <footer className="border-t border-border-subtle bg-white mt-auto py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-1">
            <BrandLogo size="md" showSubtitle />
            <p className="mt-3 text-xs text-ink-secondary leading-relaxed">
              Independent journalism, rigorous technology essays, and architectural research.
            </p>
          </div>

          <div>
            <h4 className="text-xs font-mono uppercase tracking-wider text-ink-primary font-semibold mb-3">
              Editorial Sections
            </h4>
            <ul className="space-y-2 text-xs text-ink-secondary">
              <li>
                <Link to="/category/technology" className="hover:text-ink-primary">
                  Technology &amp; Computing
                </Link>
              </li>
              <li>
                <Link to="/category/ai" className="hover:text-ink-primary">
                  Artificial Intelligence
                </Link>
              </li>
              <li>
                <Link to="/category/cybersecurity" className="hover:text-ink-primary">
                  Cybersecurity &amp; Privacy
                </Link>
              </li>
              <li>
                <Link to="/category/editorial-design" className="hover:text-ink-primary">
                  Editorial Design
                </Link>
              </li>
              <li>
                <Link to="/category/software-architecture" className="hover:text-ink-primary">
                  Software Architecture
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-mono uppercase tracking-wider text-ink-primary font-semibold mb-3">
              Publication Platform
            </h4>
            <ul className="space-y-2 text-xs text-ink-secondary">
              <li>
                <Link to="/editor" className="hover:text-ink-primary">
                  Editorial Studio
                </Link>
              </li>
              <li>
                <Link to="/register" className="hover:text-ink-primary">
                  Become an Author
                </Link>
              </li>
              <li>
                <Link to="/feed" className="hover:text-ink-primary">
                  Personalized Feed
                </Link>
              </li>
              <li>
                <Link to="/login" className="hover:text-ink-primary">
                  Sign In
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-mono uppercase tracking-wider text-ink-primary font-semibold mb-3">
              Follow The Gazette
            </h4>
            <div className="flex items-center gap-3 mb-6">
              {SOCIAL_LINKS.map((s) => (
                <a
                  key={s.symbol}
                  href={s.href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={s.label}
                  className="flex items-center justify-center w-9 h-9 border border-border-subtle bg-canvas-paper text-ink-secondary hover:text-accent-crimson hover:border-accent-crimson/40 transition-colors"
                  style={{ borderRadius: 2 }}
                >
                  <svg className="w-4 h-4" aria-hidden="true">
                    <use href={`/icons.svg#${s.symbol}`} />
                  </svg>
                </a>
              ))}
            </div>

            <h4 className="text-xs font-mono uppercase tracking-wider text-ink-primary font-semibold mb-3">
              Legal &amp; Privacy
            </h4>
            <ul className="space-y-2 text-xs text-ink-secondary">
              <li><Link to="/legal/terms" className="hover:text-ink-primary transition-colors">Terms &amp; Conditions</Link></li>
              <li><Link to="/legal/privacy" className="hover:text-ink-primary transition-colors">Privacy Policy</Link></li>
              <li><Link to="/legal/cookies" className="hover:text-ink-primary transition-colors">Cookie Policy</Link></li>
              <li><Link to="/legal/community" className="hover:text-ink-primary transition-colors">Community Guidelines</Link></li>
              <li><Link to="/legal/copyright" className="hover:text-ink-primary transition-colors">Copyright &amp; DMCA</Link></li>
              <li><Link to="/legal/acceptable-use" className="hover:text-ink-primary transition-colors">Acceptable Use</Link></li>
            </ul>
            <div className="mt-5 text-[11px] font-mono text-ink-secondary">
              © {new Date().getFullYear()} The Gazette Publishing Group.
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};
