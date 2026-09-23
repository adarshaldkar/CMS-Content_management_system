import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FileText, Shield, Cookie, Users, BookOpen, Scale, AlertCircle } from 'lucide-react';

const LEGAL_NAV = [
  { to: '/legal/terms', label: 'Terms & Conditions', icon: FileText },
  { to: '/legal/privacy', label: 'Privacy Policy', icon: Shield },
  { to: '/legal/cookies', label: 'Cookie Policy', icon: Cookie },
  { to: '/legal/community', label: 'Community Guidelines', icon: Users },
  { to: '/legal/content', label: 'Content Policy', icon: BookOpen },
  { to: '/legal/copyright', label: 'Copyright & DMCA', icon: Scale },
  { to: '/legal/acceptable-use', label: 'Acceptable Use', icon: AlertCircle },
];

interface LegalPageProps {
  title: string;
  subtitle: string;
  effective: string;
  children: React.ReactNode;
}

export const LegalPageShell: React.FC<LegalPageProps> = ({ title, subtitle, effective, children }) => {
  const { pathname } = useLocation();

  return (
    <div className="min-h-screen bg-canvas-paper font-sans">
      {/* Header Bar */}
      <div className="bg-ink-primary text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 text-xs font-mono text-stone-400 mb-3">
            <Link to="/" className="hover:text-white transition-colors">The Gazette</Link>
            <span>/</span>
            <Link to="/legal/terms" className="hover:text-white transition-colors">Legal</Link>
            <span>/</span>
            <span className="text-stone-300">{title}</span>
          </div>
          <h1 className="text-3xl font-editorial font-bold text-white">{title}</h1>
          <p className="mt-2 text-stone-300 text-sm">{subtitle}</p>
          <p className="mt-1 text-stone-500 text-xs font-mono">Effective: {effective}</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">
          {/* Sidebar Nav */}
          <aside className="lg:col-span-1">
            <div className="bg-white border border-border-subtle rounded-xl p-4 shadow-sm sticky top-24">
              <h2 className="text-[10px] font-mono uppercase tracking-widest text-ink-muted mb-3 px-2">Legal Documents</h2>
              <nav className="space-y-0.5">
                {LEGAL_NAV.map(({ to, label, icon: Icon }) => (
                  <Link
                    key={to}
                    to={to}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition-colors ${
                      pathname === to
                        ? 'bg-ink-primary text-white font-semibold'
                        : 'text-ink-secondary hover:bg-slate-50 hover:text-ink-primary'
                    }`}
                  >
                    <Icon size={14} />
                    <span>{label}</span>
                  </Link>
                ))}
              </nav>
            </div>
          </aside>

          {/* Content */}
          <main className="lg:col-span-3">
            <div className="bg-white border border-border-subtle rounded-xl shadow-sm p-8 lg:p-12 prose prose-slate prose-sm max-w-none
              prose-headings:font-editorial prose-headings:text-ink-primary
              prose-h2:text-lg prose-h2:font-bold prose-h2:border-b prose-h2:border-border-subtle prose-h2:pb-2 prose-h2:mb-4
              prose-h3:text-sm prose-h3:font-semibold prose-h3:text-ink-primary
              prose-p:text-ink-secondary prose-p:leading-relaxed prose-p:text-sm
              prose-li:text-ink-secondary prose-li:text-sm prose-li:leading-relaxed
              prose-a:text-accent-crimson prose-a:no-underline hover:prose-a:underline
              prose-strong:text-ink-primary
            ">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

/* ─── Individual Legal Pages ─── */

export const TermsPage: React.FC = () => (
  <LegalPageShell title="Terms & Conditions" subtitle="The agreement between you and The Gazette Publishing Group." effective="1 September 2026">
    <h2>1. Acceptance of Terms</h2>
    <p>By accessing or using The Gazette platform ("Service"), you agree to be bound by these Terms and Conditions ("Terms"). If you do not agree to all the Terms, do not access or use the Service.</p>

    <h2>2. Description of Service</h2>
    <p>The Gazette is an independent editorial platform providing journalism, technology analysis, and architectural research. The platform provides publishing tools, reader features, and related services.</p>

    <h2>3. User Accounts</h2>
    <p>You must create an account to access certain features. You are responsible for maintaining the confidentiality of your credentials and for all activities under your account. You must notify us immediately upon becoming aware of any breach of security or unauthorized use of your account.</p>
    <h3>3.1 Account Eligibility</h3>
    <p>You must be at least 16 years old to create an account. By creating an account you represent that you meet this requirement.</p>
    <h3>3.2 Account Termination</h3>
    <p>We reserve the right to suspend or terminate accounts that violate these Terms, our Community Guidelines, or any applicable law.</p>

    <h2>4. Content & Publishing</h2>
    <p>Authors retain ownership of the content they submit. By submitting content you grant The Gazette a non-exclusive, worldwide, royalty-free licence to display, reproduce, and distribute that content through the Service. You represent that you have the right to grant this licence and that your content does not infringe any third-party rights.</p>

    <h2>5. Prohibited Conduct</h2>
    <p>You agree not to:</p>
    <ul>
      <li>Publish false, misleading, or defamatory content</li>
      <li>Violate intellectual property rights of others</li>
      <li>Harass, threaten, or intimidate other users</li>
      <li>Attempt to gain unauthorized access to the Service or its systems</li>
      <li>Use automated means to scrape content without prior written consent</li>
      <li>Transmit malware, spam, or other harmful code</li>
    </ul>

    <h2>6. Limitation of Liability</h2>
    <p>To the fullest extent permitted by applicable law, The Gazette Publishing Group shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of or inability to use the Service.</p>

    <h2>7. Changes to Terms</h2>
    <p>We may update these Terms at any time. We will notify registered users of material changes via the Gazette Inbox. Continued use of the Service after changes constitutes acceptance of the revised Terms.</p>

    <h2>8. Governing Law</h2>
    <p>These Terms are governed by applicable law. Disputes shall be resolved through binding arbitration or in courts of competent jurisdiction.</p>

    <h2>9. Contact</h2>
    <p>For questions about these Terms, contact us through the Help page or by emailing <strong>legal@gazette.io</strong>.</p>

    <blockquote><strong>Note:</strong> These Terms require review and approval by a qualified legal advisor before being presented to users in a live production environment.</blockquote>
  </LegalPageShell>
);

export const PrivacyPage: React.FC = () => (
  <LegalPageShell title="Privacy Policy" subtitle="How The Gazette collects, uses, and protects your personal data." effective="1 September 2026">
    <h2>1. Data We Collect</h2>
    <p>We collect the following categories of personal data:</p>
    <ul>
      <li><strong>Account data:</strong> name, email address, password hash (Argon2id), role</li>
      <li><strong>Content data:</strong> articles, drafts, comments, media you upload</li>
      <li><strong>Activity data:</strong> reading history, bookmarks, searches, For You feed interactions</li>
      <li><strong>Session data:</strong> device type, browser, IP address, login timestamps</li>
      <li><strong>Communications:</strong> Gazette Inbox messages, notification history</li>
      <li><strong>Legal records:</strong> policy acceptance versions, consent timestamps, IP at consent</li>
    </ul>

    <h2>2. How We Use Your Data</h2>
    <ul>
      <li>To provide and improve the Service</li>
      <li>To personalise your reading experience</li>
      <li>To send notifications about your content and account</li>
      <li>To enforce our Terms, Community Guidelines, and applicable laws</li>
      <li>To maintain security audit logs</li>
    </ul>

    <h2>3. Data Retention</h2>
    <p>We retain your personal data for as long as your account is active or as required by law. Published articles may be retained for archival purposes. Deleted account data is anonymised or deleted within 30 days subject to legal-retention requirements.</p>

    <h2>4. Your Rights</h2>
    <p>Subject to applicable law, you have the right to:</p>
    <ul>
      <li>Access your personal data via Data Export</li>
      <li>Correct inaccurate data through your Profile Settings</li>
      <li>Request deletion of your account and associated data</li>
      <li>Withdraw optional analytics consent via Cookie Preferences</li>
      <li>Object to certain processing</li>
    </ul>

    <h2>5. Third-Party Services</h2>
    <p>We use the following third-party services: Cloudinary (media storage), Resend (transactional email), and Redis (session caching). These services have their own privacy policies.</p>

    <h2>6. Security</h2>
    <p>We protect your data with Argon2id password hashing, HttpOnly session cookies, CSRF protection, TLS in transit, and strict CORS policies. We conduct regular security audits.</p>

    <h2>7. Contact</h2>
    <p>For privacy enquiries or to exercise your rights, email <strong>privacy@gazette.io</strong>.</p>
  </LegalPageShell>
);

export const CookiePolicyPage: React.FC = () => (
  <LegalPageShell title="Cookie Policy" subtitle="How The Gazette uses cookies and similar technologies." effective="1 September 2026">
    <h2>1. What Are Cookies?</h2>
    <p>Cookies are small text files placed on your device when you visit a website. We also use similar technologies such as local storage for session preferences.</p>

    <h2>2. Categories of Cookies We Use</h2>
    <h3>2.1 Strictly Necessary</h3>
    <p>These cookies are required for the Service to function. They include authentication tokens, CSRF protection tokens, and session identifiers. You cannot opt out of these cookies.</p>

    <h3>2.2 Analytics (Optional)</h3>
    <p>These cookies help us understand how readers interact with the platform — which articles are read, time on page, and navigation paths. These cookies are only set if you consent.</p>

    <h3>2.3 Functional (Optional)</h3>
    <p>These cookies remember your preferences such as reading mode, notification settings, and language choice. Disabling them may degrade your experience.</p>

    <h3>2.4 Marketing (Optional)</h3>
    <p>Currently, The Gazette does not use marketing or advertising cookies. If this changes, we will update this policy and request fresh consent.</p>

    <h2>3. Managing Your Cookie Preferences</h2>
    <p>You can manage optional cookie consent at any time via <Link to="/settings">Account Settings → Privacy → Cookie Preferences</Link>. You may withdraw optional consent at any time. Withdrawing consent does not affect the lawfulness of prior processing.</p>

    <h2>4. Cookie Lifespan</h2>
    <ul>
      <li>Authentication session cookies: 15 minutes (access) / 7 days (refresh)</li>
      <li>Consent preference cookies: 1 year</li>
      <li>Analytics cookies: 90 days</li>
    </ul>
  </LegalPageShell>
);

export const CommunityGuidelinesPage: React.FC = () => (
  <LegalPageShell title="Community Guidelines" subtitle="The standards that make The Gazette a quality editorial community." effective="1 September 2026">
    <h2>Our Editorial Community</h2>
    <p>The Gazette is built on the principle that serious journalism and rigorous analysis require a community that values accuracy, intellectual honesty, and respectful debate. These guidelines apply to all users.</p>

    <h2>1. What We Expect</h2>
    <ul>
      <li><strong>Accuracy:</strong> Only publish content you believe to be accurate. Correct errors promptly.</li>
      <li><strong>Attribution:</strong> Credit your sources. Do not plagiarise or reproduce copyrighted material without permission.</li>
      <li><strong>Transparency:</strong> Disclose conflicts of interest relevant to your published content.</li>
      <li><strong>Respect:</strong> Engage with other users and subjects with dignity, even in disagreement.</li>
      <li><strong>Context:</strong> Do not take quotes or data out of context to misrepresent positions.</li>
    </ul>

    <h2>2. What We Prohibit</h2>
    <ul>
      <li>Harassment, threats, or personal attacks on other users or subjects</li>
      <li>Hate speech targeting protected characteristics</li>
      <li>Coordinated inauthentic behaviour or fake accounts</li>
      <li>Spam, advertising, or commercial promotion disguised as editorial content</li>
      <li>Publishing private personal information without consent (doxxing)</li>
      <li>Misinformation or deliberately false reporting</li>
    </ul>

    <h2>3. Moderation</h2>
    <p>Content that violates these guidelines will be removed. Repeat violations may result in account suspension or permanent termination. Editors review flagged content and may request corrections before removal.</p>

    <h2>4. Appeals</h2>
    <p>If your content is removed, you may appeal the decision by contacting the editorial team through the Gazette Inbox.</p>
  </LegalPageShell>
);

export const ContentPolicyPage: React.FC = () => (
  <LegalPageShell title="Content & Publishing Policy" subtitle="Standards for content submitted to The Gazette." effective="1 September 2026">
    <h2>1. Editorial Standards</h2>
    <p>All content published on The Gazette must meet basic editorial standards: factual accuracy, clear sourcing, original authorship, and relevance to our editorial mission.</p>

    <h2>2. Review Workflow</h2>
    <p>Author-submitted content enters an editorial review queue before publication. Editors may approve, request revisions, or reject submissions. Automated scheduling is available for authors with an active Publishing Slot assignment.</p>

    <h2>3. Prohibited Content</h2>
    <ul>
      <li>Content that infringes third-party intellectual property</li>
      <li>Content that violates applicable laws</li>
      <li>Advertising or sponsored content not disclosed as such</li>
      <li>Syndicated content published without a licence</li>
      <li>Machine-generated content submitted as original human journalism without disclosure</li>
    </ul>

    <h2>4. Media & Images</h2>
    <p>Authors are responsible for ensuring they have the right to publish any images, audio, or video they upload. The platform validates uploads for safety but does not verify licensing on your behalf.</p>

    <h2>5. Corrections Policy</h2>
    <p>Material factual errors must be corrected with an inline Correction notice. Corrections must not be made silently without disclosure to readers.</p>
  </LegalPageShell>
);

export const CopyrightPage: React.FC = () => (
  <LegalPageShell title="Copyright & DMCA Policy" subtitle="Our policy on intellectual property and DMCA takedown requests." effective="1 September 2026">
    <h2>1. Copyright Ownership</h2>
    <p>Authors retain copyright in the content they publish on The Gazette. The Gazette platform code, design, and brand assets are the property of The Gazette Publishing Group.</p>

    <h2>2. DMCA Takedown Requests</h2>
    <p>If you believe content on The Gazette infringes your copyright, you may submit a takedown request. Your notice must include:</p>
    <ul>
      <li>Identification of the copyrighted work claimed to be infringed</li>
      <li>Identification of the infringing material and its URL</li>
      <li>Your contact information (name, address, email, phone)</li>
      <li>A statement that you have a good-faith belief the use is not authorised</li>
      <li>A statement that the information in the notice is accurate</li>
      <li>Your physical or electronic signature</li>
    </ul>
    <p>Send notices to: <strong>dmca@gazette.io</strong></p>

    <h2>3. Counter-Notices</h2>
    <p>If your content was removed due to a mistaken or misidentified DMCA claim, you may submit a counter-notice. Please include a sworn statement that you have a good-faith belief the content was removed by mistake.</p>

    <h2>4. Repeat Infringers</h2>
    <p>We maintain a policy of terminating accounts of repeat copyright infringers.</p>
  </LegalPageShell>
);

export const AcceptableUsePage: React.FC = () => (
  <LegalPageShell title="Acceptable Use Policy" subtitle="Technical and behavioural rules for using The Gazette platform." effective="1 September 2026">
    <h2>1. Permitted Use</h2>
    <p>The Gazette platform may be used for reading published content, submitting editorial content, managing your author account, and communicating through the Gazette Inbox.</p>

    <h2>2. Prohibited Technical Activities</h2>
    <ul>
      <li>Automated scraping without prior written consent</li>
      <li>Attempting to bypass authentication, rate limits, or CSRF protection</li>
      <li>Probing for vulnerabilities without responsible-disclosure agreement</li>
      <li>Uploading malicious files, SVG exploits, or code injection payloads</li>
      <li>Creating fake accounts or using the platform through a proxy to mask identity for abusive purposes</li>
      <li>Using the platform to distribute spam or phishing content</li>
    </ul>

    <h2>3. API Usage</h2>
    <p>Third-party access to The Gazette API requires explicit written permission. Automated bulk operations without agreement are prohibited.</p>

    <h2>4. Security Responsible Disclosure</h2>
    <p>If you discover a security vulnerability, please report it responsibly to <strong>security@gazette.io</strong> before public disclosure. We will acknowledge and investigate all credible reports.</p>

    <h2>5. Enforcement</h2>
    <p>Violations of this policy may result in immediate account suspension, IP blocking, or referral to law enforcement where required by law.</p>
  </LegalPageShell>
);
