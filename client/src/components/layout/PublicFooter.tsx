import React from 'react';
import { Link } from 'react-router-dom';
import { BrandLogo } from '../common/BrandLogo';

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
                  Technology & Computing
                </Link>
              </li>
              <li>
                <Link to="/category/ai" className="hover:text-ink-primary">
                  Artificial Intelligence
                </Link>
              </li>
              <li>
                <Link to="/category/cybersecurity" className="hover:text-ink-primary">
                  Cybersecurity & Privacy
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
              Standards & Architecture
            </h4>
            <p className="text-xs text-ink-secondary leading-relaxed">
              Engineered with zero-buffer seamless database switching, strict CSRF validation, and Argon2id session security.
            </p>
            <div className="mt-4 text-[11px] font-mono text-ink-secondary">
              © {new Date().getFullYear()} The Gazette Publishing Group.
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};
