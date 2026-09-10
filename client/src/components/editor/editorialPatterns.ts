/**
 * Gazette Editorial Studio — Story Templates & Reusable Editorial Patterns
 * 
 * Purpose-built for professional newsrooms and journalistic workflows:
 * 1. Story Archetype Templates (Investigation, Breaking News, Standard Report, Interview, Opinion, Data Journalism)
 * 2. Reusable Editorial Patterns (Editor's Note, Legal Disclaimer, Source Disclosure, Author Bio, Newsletter CTA, Related Stories)
 */

export interface StoryTemplate {
  id: string;
  title: string;
  subtitle: string;
  category: string;
  readingEstimateMinutes: number;
  icon: string;
  description: string;
  defaultTitle: string;
  defaultDescription: string;
  htmlContent: string;
}

export interface EditorialPattern {
  id: string;
  title: string;
  category: 'editorial' | 'legal' | 'disclosure' | 'promotion' | 'data';
  icon: string;
  description: string;
  htmlContent: string;
  /**
   * Optional dynamic renderer so content that embeds the current date/time is
   * produced at insert time instead of at module load (CE10, e.g. corrections).
   */
  renderContent?: () => string;
}

export const STORY_TEMPLATES: StoryTemplate[] = [
  {
    id: 'investigation',
    title: 'In-Depth Investigation',
    subtitle: 'Deep-dive reporting with findings, timeline, and document evidence',
    category: 'Investigative Desk',
    readingEstimateMinutes: 8,
    icon: '🔍',
    description: 'Structured for multi-source investigative exposes with key findings callouts, chronological timelines, and primary document citations.',
    defaultTitle: 'Investigation: Key Findings into Regulatory Overhaul and Institutional Accountability',
    defaultDescription: 'A six-month inquiry reveals systemic delays, unreleased audits, and internal communications across key regulatory bodies.',
    htmlContent: `
<p class="cms-drop-cap">Following a comprehensive six-month inquiry drawing from leaked internal memorandums, confidential testimonies, and state audit disclosures, findings indicate a fundamental breakdown in operational compliance.</p>

<aside class="cms-callout" data-theme="editorial" data-node="callout">
  <header class="cms-callout-header">
    <span class="cms-callout-icon">✒️</span>
    <strong>Key Investigation Takeaways</strong>
  </header>
  <div class="cms-callout-content">
    <ul>
      <li><strong>Finding 1:</strong> Over 40% of mandated compliance audits were postponed without public disclosure.</li>
      <li><strong>Finding 2:</strong> Internal whistleblower memos warned of escalating liability 18 months prior to public awareness.</li>
      <li><strong>Finding 3:</strong> Financial reconciliation reports show millions in unallocated contingency expenditures.</li>
    </ul>
  </div>
</aside>

<h2>Chronology of Events</h2>
<p>The sequence of internal decisions traces back to early quarterly reviews, where conflicting administrative priorities delayed standard oversight protocols.</p>

<blockquote class="cms-pull-quote" data-node="pullQuote">
  <p>“The warning signs were communicated at every administrative junction, yet the necessary remedial protocols were repeatedly deferred.”</p>
  <cite>— Senior Investigative Analyst, Department of Regulatory Integrity</cite>
</blockquote>

<h2>Primary Document Disclosures</h2>
<p>Official communications reviewed by the editorial desk demonstrate that corrective recommendations issued by independent ombudsmen were categorized as secondary priorities.</p>

<footer class="cms-source-note" data-node="sourceNote">
  <div class="cms-source-note-title">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/><path d="M6 6h10"/><path d="M6 10h10"/></svg>
    <span>Investigation Methodology &amp; Sources</span>
  </div>
  <ol>
    <li>Freedom of Information Disclosures (Ref. FOI-2026-8812)</li>
    <li>Confidential interviews with six current and former regulatory administrators.</li>
    <li>Independent forensic audit conducted by certified public accountancy specialists.</li>
  </ol>
</footer>
`.trim(),
  },

  {
    id: 'breaking-news',
    title: 'Breaking News Dispatch',
    subtitle: 'High-urgency bulletin with live update timeline and verified facts',
    category: 'Breaking News',
    readingEstimateMinutes: 3,
    icon: '⚡',
    description: 'Designed for rapid publishing with developing situation notices, timestamped facts, and ongoing verification anchors.',
    defaultTitle: 'Breaking: Major Regulatory Accord Announced Following High-Stakes Summit',
    defaultDescription: 'Delegates agree on sweeping cross-border oversight frameworks during emergency closing negotiations.',
    htmlContent: `
<div class="cms-callout" data-theme="warning" data-node="callout" style="border-left: 4px solid #dc2626;">
  <header class="cms-callout-header" style="color: #dc2626;">
    <span class="cms-callout-icon">🔴</span>
    <strong>DEVELOPING STORY — LIVE UPDATES</strong>
  </header>
  <div class="cms-callout-content">
    <p><em>Information in this dispatch is verified by Gazette correspondents on the ground. Updates will be appended as official communiques are released.</em></p>
  </div>
</div>

<p class="cms-drop-cap">Negotiators concluded an intensive 48-hour emergency plenary session this morning, formalizing a landmark multi-jurisdiction regulatory agreement that reshapes industry compliance standards.</p>

<h2>What We Know So Far</h2>
<ul>
  <li><strong>The Accord:</strong> Reached at 05:30 local time following final draft reconciliations.</li>
  <li><strong>Immediate Impact:</strong> New statutory transparency guidelines take effect across all member territories immediately.</li>
  <li><strong>Official Statement:</strong> Plenary leadership is scheduled to host a joint televised press briefing at 14:00.</li>
</ul>

<blockquote class="cms-pull-quote" data-node="pullQuote">
  <p>“This agreement establishes a clear, unified boundary for accountability where ambiguity previously prevailed.”</p>
  <cite>— Lead Delegate Spokesperson</cite>
</blockquote>

<p>Gazette editors are monitoring parliamentary reactions and will update this file continuously.</p>
`.trim(),
  },

  {
    id: 'interview',
    title: 'Q&A Dialogue & Executive Interview',
    subtitle: 'Conversational format with interviewer and respondent badging',
    category: 'Profiles & Interviews',
    readingEstimateMinutes: 6,
    icon: '🎙️',
    description: 'Features styled conversational Q&A blocks, interviewer introduction, key pull-quotes, and biographical context.',
    defaultTitle: 'In Conversation: Shaping the Next Decade of Technology and Governance',
    defaultDescription: 'An exclusive dialogue on systemic architecture, open protocols, and the future of digital sovereignty.',
    htmlContent: `
<p class="cms-drop-cap">In an exclusive interview with The Gazette, industry veteran and policy architect Dr. Marcus Vance reflects on the transformative shifts underway across distributed infrastructure and digital autonomy.</p>

<aside class="cms-callout" data-theme="info" data-node="callout">
  <header class="cms-callout-header">
    <span class="cms-callout-icon">ℹ️</span>
    <strong>About the Subject</strong>
  </header>
  <div class="cms-callout-content">
    <p>Dr. Vance has served as chief architectural advisor for international digital standards consortiums and currently heads the Institute for Open Systems Research.</p>
  </div>
</aside>

<h2>The Dialogue</h2>

<p><strong>The Gazette:</strong> Over the past two years, centralization pressures have accelerated across critical infrastructure. Where do you see the primary vulnerability today?</p>

<p><strong>Dr. Marcus Vance:</strong> The vulnerability is not in the capacity of the infrastructure itself, but in the opacity of the governance layers that control it. When institutions rely on closed protocols, resilience becomes an afterthought.</p>

<blockquote class="cms-pull-quote" data-node="pullQuote">
  <p>“Resilience cannot be retrofitted onto closed architectures. It must be woven into the very first line of structural design.”</p>
  <cite>— Dr. Marcus Vance</cite>
</blockquote>

<p><strong>The Gazette:</strong> What concrete steps should engineering teams prioritize to address this risk?</p>

<p><strong>Dr. Vance:</strong> Adopt open, auditable persistence layers, enforce dual-key version controls, and guarantee that data lineage can never be altered without cryptographic auditability.</p>
`.trim(),
  },

  {
    id: 'standard-report',
    title: 'Standard Editorial Report',
    subtitle: 'Classic balanced news analysis with Newsreader typography',
    category: 'General News',
    readingEstimateMinutes: 5,
    icon: '📰',
    description: 'The definitive Gazette storytelling format: balanced editorial prose, subheadings, pull-quotes, and source references.',
    defaultTitle: 'Economic Indicators Point to Stabilizing Trends Across Key Sectors',
    defaultDescription: 'Quarterly trade statistics show resilient domestic consumption and steady supply chain recovery.',
    htmlContent: `
<p class="cms-drop-cap">Latest economic telemetry released this morning indicates broader stabilization across manufacturing and services, defying earlier forecasts of prolonged contraction.</p>

<h2>Sector Breakdown and Analysis</h2>
<p>Consumer resilience alongside modernized logistics networks has buffered key domestic industries against international currency fluctuations.</p>

<blockquote class="cms-pull-quote" data-node="pullQuote">
  <p>“We are observing consistent month-on-month inventory stabilization that suggests supply chain pressures have substantially eased.”</p>
  <cite>— Chief Macroeconomic Strategist, Capital Advisory Group</cite>
</blockquote>

<h2>Looking Ahead to the Next Fiscal Quarter</h2>
<p>Policy analysts emphasize that while the immediate indicators remain encouraging, long-term capital investments will depend on upcoming central bank reserve rate deliberations.</p>

<footer class="cms-source-note" data-node="sourceNote">
  <div class="cms-source-note-title">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/><path d="M6 6h10"/><path d="M6 10h10"/></svg>
    <span>Data Sources</span>
  </div>
  <ol>
    <li>Department of Commerce Quarterly Trade Indices (Q3 2026).</li>
    <li>National Bureau of Economic Statistics Monthly Industrial Survey.</li>
  </ol>
</footer>
`.trim(),
  },

  {
    id: 'opinion',
    title: 'Opinion & Editorial Commentary',
    subtitle: 'Columnist perspective with thesis pull-quote and author byline desk',
    category: 'Opinion & Editorial',
    readingEstimateMinutes: 4,
    icon: '✍️',
    description: 'Designed for analytical commentary, guest columns, and editorial board statements with prominent author branding.',
    defaultTitle: 'The Imperative for Transparent Architecture in Public Institutions',
    defaultDescription: 'Why open standards and transparent auditing are essential safeguards for modern civil governance.',
    htmlContent: `
<p class="cms-drop-cap">Trust in institutional governance is not an abstract sentiment—it is the direct outcome of observable transparency and reliable auditing mechanisms.</p>

<blockquote class="cms-pull-quote" data-node="pullQuote">
  <p>“When institutions operate behind opaque administrative walls, public trust diminishes not from malice, but from the inability to verify.”</p>
  <cite>— Senior Editorial Board Commentary</cite>
</blockquote>

<h2>The Cost of Institutional Opacity</h2>
<p>Throughout historical transitions, systems that prioritized open reporting protocols demonstrated markedly higher resilience during unexpected crises than those reliant on closed discretion.</p>

<div class="cms-editorial-divider" data-style="asterism"><span>⁂</span></div>

<p><em>The views expressed in this column reflect the editorial consensus of The Gazette Editorial Board.</em></p>
`.trim(),
  },
];

export const EDITORIAL_PATTERNS: EditorialPattern[] = [
  {
    id: 'editors-note',
    title: 'Editor’s Note / Clarification',
    category: 'editorial',
    icon: '✒️',
    description: 'Official clarification regarding updates, context, or post-publication developments.',
    htmlContent: `
<aside class="cms-callout" data-theme="editorial" data-node="callout">
  <header class="cms-callout-header">
    <span class="cms-callout-icon">✒️</span>
    <strong>Editor’s Note</strong>
  </header>
  <div class="cms-callout-content">
    <p>This article has been updated to reflect official statements released by regulatory representatives following the initial morning dispatch.</p>
  </div>
</aside>
`.trim(),
  },

  {
    id: 'correction-notice',
    title: 'Journalistic Correction Notice',
    category: 'editorial',
    icon: '🛡️',
    description: 'Formal, transparent correction badge with timestamp and rectification text.',
    htmlContent: `
<div class="cms-editorial-correction" data-date="__GAZETTE_DATE__" data-node="correction">
  <div class="cms-correction-badge">
    <span class="badge-text">CORRECTION</span>
    <time datetime="__GAZETTE_ISO__">__GAZETTE_DATE__</time>
  </div>
  <p>An earlier version of this report misstated the initial fiscal year deficit figure. The accurate figure of $4.2 billion has been updated in the third paragraph.</p>
</div>
`.trim(),
    renderContent: () => {
      const now = new Date();
      const label = now.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
      return `
<div class="cms-editorial-correction" data-date="${label}" data-node="correction">
  <div class="cms-correction-badge">
    <span class="badge-text">CORRECTION</span>
    <time datetime="${now.toISOString()}">${label}</time>
  </div>
  <p>An earlier version of this report misstated the initial fiscal year deficit figure. The accurate figure of $4.2 billion has been updated in the third paragraph.</p>
</div>
`.trim();
    },
  },

  {
    id: 'legal-disclaimer',
    title: 'Legal & Financial Disclaimer',
    category: 'legal',
    icon: '⚖️',
    description: 'Standard institutional disclosure regarding analytical or financial reporting.',
    htmlContent: `
<aside class="cms-callout" data-theme="warning" data-node="callout" style="font-size: 0.85rem; color: #64748b;">
  <header class="cms-callout-header">
    <span class="cms-callout-icon">⚖️</span>
    <strong>Legal &amp; Advisory Notice</strong>
  </header>
  <div class="cms-callout-content">
    <p>This dispatch is published for journalistic informational purposes only and does not constitute financial, investment, or legal advisory. Independent professional counsel should be sought before acting upon market analyses.</p>
  </div>
</aside>
`.trim(),
  },

  {
    id: 'source-disclosure',
    title: 'Source Disclosure & Ethics Statement',
    category: 'disclosure',
    icon: '📖',
    description: 'Standard Gazette disclosure regarding independence, funding, or conflicts of interest.',
    htmlContent: `
<aside class="cms-callout" data-theme="info" data-node="callout">
  <header class="cms-callout-header">
    <span class="cms-callout-icon">🔍</span>
    <strong>Editorial Independence &amp; Disclosure</strong>
  </header>
  <div class="cms-callout-content">
    <p>The Gazette adheres strictly to the International Code of Journalistic Ethics. Reporting is conducted independently without commercial or sponsor oversight. Direct all editorial inquiries to <em>ethics@gazette.press</em>.</p>
  </div>
</aside>
`.trim(),
  },

  {
    id: 'newsletter-cta',
    title: 'Newsletter Subscription Banner',
    category: 'promotion',
    icon: '📬',
    description: 'Clean embedded call-to-action inviting readers to subscribe to the morning dispatch.',
    htmlContent: `
<div class="cms-newsletter-cta" style="background: linear-gradient(135deg, #0f172a, #1e293b); color: #ffffff; padding: 2rem; border-radius: 6px; margin: 2rem 0; text-align: center;">
  <h3 style="color: #ffffff; font-family: 'Newsreader', serif; font-size: 1.5rem; margin-bottom: 0.5rem;">Stay Ahead with The Gazette Morning Dispatch</h3>
  <p style="color: #cbd5e1; font-size: 0.9rem; max-width: 500px; margin: 0 auto 1.25rem auto;">In-depth journalistic investigations, market analyses, and cultural essays delivered straight to your inbox daily.</p>
  <div style="display: inline-flex; gap: 0.5rem; max-width: 420px; width: 100%;">
    <input type="email" placeholder="Enter your email address…" style="flex: 1; padding: 0.65rem 1rem; border-radius: 3px; border: 1px solid #475569; background: #0f172a; color: #ffffff; font-size: 0.85rem;" disabled />
    <button type="button" style="background: #8b0000; color: #ffffff; padding: 0.65rem 1.25rem; font-weight: 600; font-size: 0.85rem; border-radius: 3px; border: none;" disabled>Subscribe</button>
  </div>
</div>
`.trim(),
  },

  {
    id: 'related-stories',
    title: 'Related Investigative Stories Grid',
    category: 'promotion',
    icon: '📑',
    description: 'Curated 2-column recommendations block for related reporting.',
    htmlContent: `
<div class="cms-related-stories" style="border-top: 2px solid #e2e8f0; border-bottom: 2px solid #e2e8f0; padding: 1.5rem 0; margin: 2.5rem 0;">
  <h4 style="font-family: 'Newsreader', serif; font-size: 1.1rem; color: #0f172a; margin-bottom: 1rem; text-transform: uppercase; letter-spacing: 0.05em;">Related In-Depth Dispatches</h4>
  <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1.5rem;">
    <div style="border-left: 3px solid #8b0000; padding-left: 0.75rem;">
      <span style="font-size: 0.72rem; color: #8b0000; font-weight: 700; text-transform: uppercase;">Investigation Part I</span>
      <h5 style="font-size: 0.95rem; font-weight: 600; color: #0f172a; margin: 0.25rem 0;">The Anatomy of the Initial Regulatory Disclosure</h5>
      <p style="font-size: 0.8rem; color: #64748b; margin: 0;">How early telemetry signals were surfaced by independent auditors.</p>
    </div>
    <div style="border-left: 3px solid #0f172a; padding-left: 0.75rem;">
      <span style="font-size: 0.72rem; color: #475569; font-weight: 700; text-transform: uppercase;">Policy Analysis</span>
      <h5 style="font-size: 0.95rem; font-weight: 600; color: #0f172a; margin: 0.25rem 0;">Comparing Cross-Border Compliance Frameworks</h5>
      <p style="font-size: 0.8rem; color: #64748b; margin: 0;">A comparative study across European and North American regulatory desks.</p>
    </div>
  </div>
</div>
`.trim(),
  },
];
