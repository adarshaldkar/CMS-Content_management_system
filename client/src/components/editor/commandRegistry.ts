export type CommandCategory =
  | 'text'
  | 'format'
  | 'insert'
  | 'media'
  | 'editorial'
  | 'review'
  | 'view';

export interface EditorialCommand {
  id: string;
  title: string;
  category: CommandCategory;
  shortcut?: string;
  icon: string;
  description?: string;
  keywords: string[];
  execute: (context: CommandExecutionContext, payload?: any) => void;
  isEnabled?: (context: CommandExecutionContext) => boolean;
  isActive?: (context: CommandExecutionContext) => boolean;
}

export interface CommandExecutionContext {
  editorRef: React.RefObject<HTMLDivElement | null>;
  executeCommand: (command: string, valueArg?: string) => void;
  insertHtml: (html: string) => void;
  openModal: (modalName: string, initialPayload?: any) => void;
  toggleInspector?: () => void;
  setWorkspaceMode?: (mode: 'write' | 'review' | 'preview') => void;
  showOutline?: () => void;
  triggerPrePublishCheck?: () => void;
}

export function toggleSemanticHighlight(ctx?: CommandExecutionContext) {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return;

  const range = sel.getRangeAt(0);

  // Check if selection is currently inside an existing <mark> or highlighted element
  let markNode: HTMLElement | null = null;
  let node: Node | null = sel.anchorNode;

  while (node && node !== document.body) {
    if (
      node instanceof HTMLElement &&
      (node.tagName === 'MARK' || node.classList.contains('cms-semantic-highlight'))
    ) {
      markNode = node;
      break;
    }
    node = node.parentNode;
  }

  if (!markNode && sel.focusNode) {
    let fNode: Node | null = sel.focusNode;
    while (fNode && fNode !== document.body) {
      if (
        fNode instanceof HTMLElement &&
        (fNode.tagName === 'MARK' || fNode.classList.contains('cms-semantic-highlight'))
      ) {
        markNode = fNode;
        break;
      }
      fNode = fNode.parentNode;
    }
  }

  if (markNode) {
    // ─── TOGGLE OFF / UN-HIGHLIGHT ───
    const parent = markNode.parentNode;
    if (parent) {
      while (markNode.firstChild) {
        parent.insertBefore(markNode.firstChild, markNode);
      }
      parent.removeChild(markNode);
    }
    return;
  }

  // ─── TOGGLE ON / APPLY HIGHLIGHT ───
  if (range.collapsed) return;

  try {
    const fragment = range.extractContents();
    const mark = document.createElement('mark');
    mark.className = 'cms-semantic-highlight bg-rose-50 text-accent-crimson px-1.5 py-0.5 rounded-xs font-medium';
    mark.appendChild(fragment);
    range.insertNode(mark);

    // Maintain selection on the highlighted element
    sel.removeAllRanges();
    const newRange = document.createRange();
    newRange.selectNodeContents(mark);
    sel.addRange(newRange);
  } catch {
    try {
      const mark = document.createElement('mark');
      mark.className = 'cms-semantic-highlight bg-rose-50 text-accent-crimson px-1.5 py-0.5 rounded-xs font-medium';
      range.surroundContents(mark);
    } catch {
      document.execCommand('hiliteColor', false, '#ffe4e6');
    }
  }
}

export const EDITORIAL_COMMANDS: EditorialCommand[] = [
  // ─── TEXT CATEGORY ────────────────────────────────────────────────────────
  {
    id: 'text.paragraph',
    title: 'Paragraph',
    category: 'text',
    shortcut: 'Ctrl+Alt+0',
    icon: 'Pilcrow',
    description: 'Standard body manuscript text',
    keywords: ['paragraph', 'p', 'body', 'normal', 'text'],
    execute: (ctx) => ctx.executeCommand('formatBlock', '<p>'),
  },
  {
    id: 'text.h1',
    title: 'Heading 1 (H1)',
    category: 'text',
    shortcut: 'Ctrl+Alt+1',
    icon: 'Heading1',
    description: 'Primary major section headline',
    keywords: ['heading 1', 'h1', 'title', 'section'],
    execute: (ctx) => ctx.executeCommand('formatBlock', '<h2>'),
  },
  {
    id: 'text.h2',
    title: 'Heading 2 (H2)',
    category: 'text',
    shortcut: 'Ctrl+Alt+2',
    icon: 'Heading2',
    description: 'Subsection header',
    keywords: ['heading 2', 'h2', 'subsection', 'header'],
    execute: (ctx) => ctx.executeCommand('formatBlock', '<h3>'),
  },
  {
    id: 'text.h3',
    title: 'Heading 3 (H3)',
    category: 'text',
    shortcut: 'Ctrl+Alt+3',
    icon: 'Heading3',
    description: 'Minor subsection block header',
    keywords: ['heading 3', 'h3', 'subheading'],
    execute: (ctx) => ctx.executeCommand('formatBlock', '<h4>'),
  },
  {
    id: 'text.subtitle',
    title: 'Subtitle / Editorial Deck',
    category: 'text',
    icon: 'Type',
    description: 'Lead-in summary paragraph',
    keywords: ['subtitle', 'deck', 'lead', 'summary'],
    execute: (ctx) =>
      ctx.insertHtml(
        '<p class="text-lg text-ink-secondary font-serif italic leading-relaxed my-4">Add story subtitle or editorial deck…</p><p><br></p>',
      ),
  },
  {
    id: 'text.quote',
    title: 'Blockquote',
    category: 'text',
    shortcut: 'Ctrl+Shift+Q',
    icon: 'Quote',
    description: 'Standard quoted excerpt',
    keywords: ['quote', 'blockquote', 'cite'],
    execute: (ctx) => ctx.executeCommand('formatBlock', '<blockquote>'),
  },
  {
    id: 'text.pullquote',
    title: 'Editorial Pull Quote',
    category: 'text',
    icon: 'MessageSquareQuote',
    description: 'High-impact display quote with crimson border',
    keywords: ['pull quote', 'pullquote', 'featured quote'],
    execute: (ctx) =>
      ctx.insertHtml(`
        <blockquote class="my-6 pl-4 border-l-3 border-accent-crimson font-serif italic text-lg sm:text-xl text-ink-primary leading-snug">
          "Notable editorial quotation to feature prominently in the story."
          <span class="block text-xs font-mono text-ink-secondary not-italic mt-2">— Source Citation or Attribution</span>
        </blockquote>
        <p><br></p>
      `),
  },

  // ─── FORMAT CATEGORY ──────────────────────────────────────────────────────
  {
    id: 'format.bold',
    title: 'Bold',
    category: 'format',
    shortcut: 'Ctrl+B',
    icon: 'Bold',
    keywords: ['bold', 'strong', 'weight'],
    execute: (ctx) => ctx.executeCommand('bold'),
  },
  {
    id: 'format.italic',
    title: 'Italic',
    category: 'format',
    shortcut: 'Ctrl+I',
    icon: 'Italic',
    keywords: ['italic', 'emphasis', 'slant'],
    execute: (ctx) => ctx.executeCommand('italic'),
  },
  {
    id: 'format.underline',
    title: 'Underline',
    category: 'format',
    shortcut: 'Ctrl+U',
    icon: 'Underline',
    keywords: ['underline'],
    execute: (ctx) => ctx.executeCommand('underline'),
  },
  {
    id: 'format.strikethrough',
    title: 'Strikethrough',
    category: 'format',
    shortcut: 'Ctrl+Shift+X',
    icon: 'Strikethrough',
    keywords: ['strikethrough', 'strike', 'delete'],
    execute: (ctx) => ctx.executeCommand('strikeThrough'),
  },
  {
    id: 'format.highlight',
    title: 'Semantic Highlight',
    category: 'format',
    icon: 'Highlighter',
    description: 'Highlight text in Gazette blush accent (toggleable)',
    keywords: ['highlight', 'marker', 'color', 'blush'],
    execute: (ctx) => toggleSemanticHighlight(ctx),
  },
  {
    id: 'format.codeblock',
    title: 'Code Block',
    category: 'format',
    shortcut: 'Ctrl+Shift+C',
    icon: 'Code',
    description: 'Preformatted code snippet',
    keywords: ['code', 'pre', 'programming'],
    execute: (ctx) => ctx.executeCommand('formatBlock', '<pre>'),
  },
  {
    id: 'format.align.left',
    title: 'Align Left',
    category: 'format',
    icon: 'AlignLeft',
    keywords: ['align', 'left'],
    execute: (ctx) => ctx.executeCommand('justifyLeft'),
  },
  {
    id: 'format.align.center',
    title: 'Align Center',
    category: 'format',
    icon: 'AlignCenter',
    keywords: ['align', 'center'],
    execute: (ctx) => ctx.executeCommand('justifyCenter'),
  },
  {
    id: 'format.align.right',
    title: 'Align Right',
    category: 'format',
    icon: 'AlignRight',
    keywords: ['align', 'right'],
    execute: (ctx) => ctx.executeCommand('justifyRight'),
  },
  {
    id: 'format.align.justify',
    title: 'Justify Text',
    category: 'format',
    icon: 'AlignJustify',
    keywords: ['align', 'justify'],
    execute: (ctx) => ctx.executeCommand('justifyFull'),
  },
  {
    id: 'format.list.bullet',
    title: 'Bullet List',
    category: 'format',
    icon: 'List',
    keywords: ['list', 'bullet', 'ul'],
    execute: (ctx) => ctx.executeCommand('insertUnorderedList'),
  },
  {
    id: 'format.list.numbered',
    title: 'Numbered List',
    category: 'format',
    icon: 'ListOrdered',
    keywords: ['list', 'numbered', 'ol'],
    execute: (ctx) => ctx.executeCommand('insertOrderedList'),
  },
  {
    id: 'format.clear',
    title: 'Clear Formatting',
    category: 'format',
    shortcut: 'Ctrl+\\',
    icon: 'RemoveFormatting',
    keywords: ['clear', 'remove formatting', 'clean'],
    execute: (ctx) => ctx.executeCommand('removeFormat'),
  },

  // ─── INSERT CATEGORY ──────────────────────────────────────────────────────
  {
    id: 'insert.link',
    title: 'Smart Hyperlink',
    category: 'insert',
    shortcut: 'Ctrl+K',
    icon: 'LinkIcon',
    description: 'Insert external URL or link to Gazette story',
    keywords: ['link', 'url', 'href', 'hyperlink'],
    execute: (ctx) => ctx.openModal('link'),
  },
  {
    id: 'insert.table',
    title: 'Interactive Table',
    category: 'insert',
    icon: 'Table',
    description: 'Insert customizable data table with styling options',
    keywords: ['table', 'grid', 'data', 'matrix', 'rows', 'columns'],
    execute: (ctx) => ctx.openModal('table'),
  },
  {
    id: 'insert.divider',
    title: 'Hairline Divider',
    category: 'insert',
    icon: 'Minus',
    description: 'Editorial section break line',
    keywords: ['divider', 'hr', 'line', 'break', 'separator'],
    execute: (ctx) =>
      ctx.insertHtml('<hr class="cms-divider my-8 border-t border-border-subtle" /><p><br></p>'),
  },

  // ─── MEDIA CATEGORY ───────────────────────────────────────────────────────
  {
    id: 'media.image',
    title: 'Insert Image Asset',
    category: 'media',
    icon: 'ImageIcon',
    description: 'Select from Media Library or upload image asset',
    keywords: ['image', 'photo', 'picture', 'upload', 'asset'],
    execute: (ctx) => ctx.openModal('mediaPicker'),
  },
  {
    id: 'media.video',
    title: 'Upload Native Video',
    category: 'media',
    icon: 'Film',
    description: 'Self-hosted MP4, WebM, MOV video with poster',
    keywords: ['video', 'native video', 'mp4', 'movie', 'film'],
    execute: (ctx) => ctx.openModal('videoUpload'),
  },
  {
    id: 'media.embed',
    title: 'Embed Video / Rich Link',
    category: 'media',
    icon: 'Video',
    description: 'YouTube, Vimeo, Loom, Spotify, or X URL embed',
    keywords: ['youtube', 'vimeo', 'spotify', 'embed', 'player', 'loom'],
    execute: (ctx) => ctx.openModal('richEmbed'),
  },
  {
    id: 'media.document',
    title: 'Import Manuscript (.docx, .pdf)',
    category: 'media',
    icon: 'FileText',
    description: 'Ingest Word (.docx), PDF (.pdf), or Markdown files',
    keywords: ['import', 'docx', 'pdf', 'word', 'document', 'markdown'],
    execute: (ctx) => ctx.openModal('docImport'),
  },

  // ─── EDITORIAL CATEGORY ───────────────────────────────────────────────────
  {
    id: 'editorial.note',
    title: "Editor's Note",
    category: 'editorial',
    icon: 'MessageSquare',
    description: 'Highlighted note providing editorial context or updates',
    keywords: ['note', 'editors note', 'callout', 'context'],
    execute: (ctx) =>
      ctx.insertHtml(`
        <div class="cms-callout-note my-5 p-4 bg-amber-50/70 border-l-3 border-amber-600 rounded-xs text-sm font-sans text-ink-primary">
          <p class="m-0 font-medium text-amber-950"><strong>Editor's Note:</strong> This dispatch was updated with confirmed findings on database replication latency.</p>
        </div>
        <p><br></p>
      `),
  },
  {
    id: 'editorial.correction',
    title: 'Correction / Errata',
    category: 'editorial',
    icon: 'AlertTriangle',
    description: 'Formal transparent correction notice block',
    keywords: ['correction', 'errata', 'amendment', 'notice'],
    execute: (ctx) =>
      ctx.insertHtml(`
        <div class="cms-callout-warning my-5 p-4 bg-slate-100 border-l-3 border-slate-700 rounded-xs text-xs font-mono text-ink-primary">
          <p class="m-0 text-slate-800"><strong>Correction (Sept 8, 2026):</strong> An earlier version of this story referenced legacy connection strings. The parameters have been updated.</p>
        </div>
        <p><br></p>
      `),
  },
  {
    id: 'editorial.keyfact',
    title: 'Key Fact / Fact Box',
    category: 'editorial',
    icon: 'Sparkles',
    description: 'Structured summary card for key takeaways and stats',
    keywords: ['fact', 'key fact', 'takeaway', 'stat', 'box'],
    execute: (ctx) =>
      ctx.insertHtml(`
        <div class="my-6 p-4 bg-slate-50 border border-slate-200 rounded-xs space-y-2">
          <span class="text-[11px] font-mono font-bold uppercase tracking-wider text-accent-crimson block">
            Key Takeaways
          </span>
          <ul class="text-xs font-sans text-ink-primary space-y-1 pl-4 list-disc">
            <li>Primary mesh database latency reduced by 40% under production loads.</li>
            <li>Multi-region replica failover completes in under 2.5 seconds.</li>
          </ul>
        </div>
        <p><br></p>
      `),
  },
  {
    id: 'editorial.citation',
    title: 'Source Attribution',
    category: 'editorial',
    icon: 'Bookmark',
    description: 'Bibliographic reference and verified source disclosure',
    keywords: ['source', 'citation', 'attribution', 'reference', 'bibliography'],
    execute: (ctx) =>
      ctx.insertHtml(`
        <div class="my-5 p-3 bg-slate-50 border-t border-b border-slate-200 text-xs font-mono text-ink-secondary">
          <span>Source: <strong>Gazette Systems Telemetry Laboratory</strong>. Data verified on Sept 8, 2026.</span>
        </div>
        <p><br></p>
      `),
  },

  // ─── REVIEW CATEGORY ──────────────────────────────────────────────────────
  {
    id: 'review.revisions',
    title: 'Revision History',
    category: 'review',
    icon: 'History',
    description: 'Browse saved versions and restore historical states',
    keywords: ['history', 'revisions', 'versions', 'restore'],
    execute: (ctx) => ctx.openModal('revisionHistory'),
  },
  {
    id: 'review.diff',
    title: 'Visual Diff Comparator',
    category: 'review',
    icon: 'GitCompare',
    description: 'Compare current manuscript with previous revisions',
    keywords: ['diff', 'compare', 'changes', 'additions', 'deletions'],
    execute: (ctx) => ctx.openModal('diffViewer'),
  },

  // ─── VIEW CATEGORY ────────────────────────────────────────────────────────
  {
    id: 'view.inspector',
    title: 'Toggle Inspector',
    category: 'view',
    shortcut: 'Ctrl+\\',
    icon: 'PanelRight',
    description: 'Show or hide the contextual metadata sidebar',
    keywords: ['inspector', 'sidebar', 'panel', 'meta'],
    execute: (ctx) => ctx.toggleInspector && ctx.toggleInspector(),
  },
  {
    id: 'view.preview',
    title: 'Reader Preview Mode',
    category: 'view',
    shortcut: 'Ctrl+P',
    icon: 'Eye',
    description: 'Simulate the public Gazette reader experience',
    keywords: ['preview', 'reader', 'view'],
    execute: (ctx) => ctx.setWorkspaceMode && ctx.setWorkspaceMode('preview'),
  },
];
