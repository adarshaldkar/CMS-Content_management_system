import React from 'react';
import { editorialNodes } from './editorialNodes';

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
    // Fallback
  }
}

export function deleteCurrentBlock(ctx: CommandExecutionContext): void {

  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0 || !ctx.editorRef.current) return;

  const editor = ctx.editorRef.current;
  let targetNode: Node | null = sel.anchorNode;

  while (targetNode && targetNode !== editor) {
    if (targetNode instanceof HTMLElement) {
      const tag = targetNode.tagName.toUpperCase();
      const isBlock = ['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'BLOCKQUOTE', 'FIGURE', 'TABLE', 'ASIDE', 'PRE', 'HR', 'DIV'].includes(tag);
      if (isBlock) {
        const nextSibling = targetNode.nextElementSibling || targetNode.previousElementSibling;
        targetNode.remove();
        if (nextSibling && nextSibling instanceof HTMLElement) {
          const range = document.createRange();
          range.selectNodeContents(nextSibling);
          range.collapse(true);
          sel.removeAllRanges();
          sel.addRange(range);
        } else if (editor.innerHTML.trim() === '') {
          editor.innerHTML = '<p><br></p>';
        }
        return;
      }
    }
    targetNode = targetNode.parentNode;
  }
}

export function clearEntireManuscript(ctx: CommandExecutionContext): void {
  if (!ctx.editorRef.current) return;
  ctx.editorRef.current.innerHTML = '<p><br></p>';
  const sel = window.getSelection();
  if (sel) {
    const range = document.createRange();
    range.selectNodeContents(ctx.editorRef.current);
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);
  }
}


export const EDITORIAL_COMMANDS: EditorialCommand[] = [
  // ─── TEXT CATEGORY ────────────────────────────────────────────────────────
  {
    id: 'text.h1',
    title: 'Headline (H1)',
    category: 'text',
    shortcut: 'Ctrl+Alt+1',
    icon: 'Heading1',
    description: 'Major section headline for the article',
    keywords: ['heading', 'h1', 'title', 'headline'],
    execute: (ctx) => ctx.executeCommand('formatBlock', '<h1>'),
  },
  {
    id: 'text.h2',
    title: 'Section Heading (H2)',
    category: 'text',
    shortcut: 'Ctrl+Alt+2',
    icon: 'Heading2',
    description: 'Secondary division within the story',
    keywords: ['heading', 'h2', 'subhead', 'section'],
    execute: (ctx) => ctx.executeCommand('formatBlock', '<h2>'),
  },
  {
    id: 'text.h3',
    title: 'Subsection (H3)',
    category: 'text',
    shortcut: 'Ctrl+Alt+3',
    icon: 'Heading3',
    description: 'Minor section or clause header',
    keywords: ['heading', 'h3', 'minor', 'topic'],
    execute: (ctx) => ctx.executeCommand('formatBlock', '<h3>'),
  },
  {
    id: 'text.paragraph',
    title: 'Paragraph Body',
    category: 'text',
    shortcut: 'Ctrl+Alt+0',
    icon: 'Pilcrow',
    description: 'Standard editorial narrative body text',
    keywords: ['paragraph', 'text', 'normal', 'body', 'p'],
    execute: (ctx) => ctx.executeCommand('formatBlock', '<p>'),
  },
  {
    id: 'text.dropCap',
    title: 'Toggle Drop-Cap',
    category: 'text',
    icon: 'Type',
    description: 'Illuminated decorative first letter for opening paragraphs',
    keywords: ['drop cap', 'large letter', 'opening', 'illuminated'],
    execute: (ctx) => {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return;
      let node: Node | null = sel.anchorNode;
      while (node && node !== ctx.editorRef.current) {
        if (node instanceof HTMLElement && node.tagName === 'P') {
          node.classList.toggle('cms-drop-cap');
          break;
        }
        node = node.parentNode;
      }
    },
  },
  {
    id: 'text.quote',
    title: 'Blockquote',
    category: 'text',
    shortcut: 'Ctrl+Shift+Q',
    icon: 'Quote',
    description: 'Indented quotation block',
    keywords: ['quote', 'blockquote', 'citation', 'indent'],
    execute: (ctx) => ctx.executeCommand('formatBlock', '<blockquote>'),
  },
  {
    id: 'text.pullQuote',
    title: 'Editorial Pull Quote',
    category: 'text',
    icon: 'MessageSquareQuote',
    description: 'Styled pull quote with author attribution',
    keywords: ['pull quote', 'callout quote', 'featured quote', 'cite'],
    execute: (ctx) => {
      const sel = window.getSelection();
      const text = sel ? sel.toString().trim() : '';
      const html = editorialNodes.createPullQuote(text || 'A compelling journalistic statement capturing the essence of the report.');
      ctx.insertHtml(`${html}<p><br></p>`);
    },
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
    keywords: ['italic', 'emphasis', 'em', 'slant'],
    execute: (ctx) => ctx.executeCommand('italic'),
  },
  {
    id: 'format.underline',
    title: 'Underline',
    category: 'format',
    shortcut: 'Ctrl+U',
    icon: 'Underline',
    keywords: ['underline', 'score'],
    execute: (ctx) => ctx.executeCommand('underline'),
  },
  {
    id: 'format.strikethrough',
    title: 'Strikethrough',
    category: 'format',
    shortcut: 'Ctrl+Shift+X',
    icon: 'Strikethrough',
    keywords: ['strike', 'strikethrough', 'del', 'cross'],
    execute: (ctx) => ctx.executeCommand('strikeThrough'),
  },
  {
    id: 'format.highlight',
    title: 'Semantic Highlight',
    category: 'format',
    shortcut: 'Ctrl+Shift+H',
    icon: 'Highlighter',
    description: 'Mark important passage with soft Gazette crimson tint',
    keywords: ['highlight', 'mark', 'yellow', 'crimson', 'color'],
    execute: (ctx) => toggleSemanticHighlight(ctx),
  },
  {
    id: 'format.code',
    title: 'Inline Code',
    category: 'format',
    shortcut: 'Ctrl+`',
    icon: 'Code',
    keywords: ['code', 'inline code', 'monospace'],
    execute: (ctx) => {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return;
      const range = sel.getRangeAt(0);
      const code = document.createElement('code');
      code.className = 'cms-inline-code px-1.5 py-0.5 rounded bg-slate-100 font-mono text-xs text-rose-800 dark:bg-slate-800 dark:text-rose-400';
      try {
        code.appendChild(range.extractContents());
        range.insertNode(code);
      } catch {
        // Ignore
      }
    },
  },
  {
    id: 'format.align.left',
    title: 'Align Left',
    category: 'format',
    shortcut: 'Ctrl+Shift+L',
    icon: 'AlignLeft',
    keywords: ['align', 'left'],
    execute: (ctx) => ctx.executeCommand('justifyLeft'),
  },
  {
    id: 'format.align.center',
    title: 'Align Center',
    category: 'format',
    shortcut: 'Ctrl+Shift+E',
    icon: 'AlignCenter',
    keywords: ['align', 'center'],
    execute: (ctx) => ctx.executeCommand('justifyCenter'),
  },
  {
    id: 'format.align.right',
    title: 'Align Right',
    category: 'format',
    shortcut: 'Ctrl+Shift+R',
    icon: 'AlignRight',
    keywords: ['align', 'right'],
    execute: (ctx) => ctx.executeCommand('justifyRight'),
  },
  {
    id: 'format.align.justify',
    title: 'Justify Text',
    category: 'format',
    shortcut: 'Ctrl+Shift+J',
    icon: 'AlignJustify',
    keywords: ['align', 'justify'],
    execute: (ctx) => ctx.executeCommand('justifyFull'),
  },
  {
    id: 'format.list.bullet',
    title: 'Bullet List',
    category: 'format',
    shortcut: 'Ctrl+Shift+8',
    icon: 'List',
    keywords: ['list', 'bullet', 'ul'],
    execute: (ctx) => ctx.executeCommand('insertUnorderedList'),
  },
  {
    id: 'format.list.numbered',
    title: 'Numbered List',
    category: 'format',
    shortcut: 'Ctrl+Shift+7',
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
  {
    id: 'edit.deleteBlock',
    title: 'Delete Current Block',
    category: 'format',
    shortcut: 'Ctrl+Shift+Delete',
    icon: 'Trash2',
    description: 'Delete enclosing block (paragraph, table, image, callout, quote)',
    keywords: ['delete', 'remove', 'trash', 'block', 'erase'],
    execute: (ctx) => deleteCurrentBlock(ctx),
  },
  {
    id: 'edit.clearAll',
    title: 'Clear Entire Manuscript',
    category: 'format',
    shortcut: 'Ctrl+Alt+Backspace',
    icon: 'RotateCcw',
    description: 'Reset manuscript canvas to blank slate',
    keywords: ['clear all', 'delete all', 'reset', 'blank', 'empty'],
    execute: (ctx) => clearEntireManuscript(ctx),
  },


  // ─── INSERT CATEGORY ──────────────────────────────────────────────────────
  {
    id: 'insert.templates',
    title: 'Story Templates (Archetypes)',
    category: 'insert',
    icon: 'Sparkles',
    description: 'Load pre-structured newsroom formats (Investigation, Breaking, Interview, Opinion)',
    keywords: ['template', 'story', 'archetype', 'investigation', 'interview', 'format'],
    execute: (ctx) => ctx.openModal('storyTemplates'),
  },
  {
    id: 'insert.patterns',
    title: 'Editorial Patterns & Synced Blocks',
    category: 'insert',
    icon: 'Bookmark',
    description: 'Insert pre-styled notices, corrections, disclosures, and CTAs',
    keywords: ['pattern', 'reusable', 'synced block', 'disclaimer', 'bio', 'cta'],
    execute: (ctx) => ctx.openModal('editorialPatterns'),
  },
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
    id: 'insert.callout',
    title: 'Editorial Callout Box',
    category: 'insert',
    icon: 'MessageSquare',
    description: 'Themed background context, key takeaways, or analytical brief',
    keywords: ['callout', 'box', 'aside', 'note', 'takeaway'],
    execute: (ctx) => {
      const html = editorialNodes.createCallout('Editorial Brief', 'Provide crucial background context or key takeaways here.', 'info');
      ctx.insertHtml(`${html}<p><br></p>`);
    },
  },
  {
    id: 'insert.sources',
    title: 'Sources & References Block',
    category: 'insert',
    icon: 'FileText',
    description: 'Numbered citations and document bibliography',
    keywords: ['sources', 'references', 'citations', 'bibliography', 'footnotes'],
    execute: (ctx) => {
      const html = editorialNodes.createSourceNote(['Primary reporting and institutional disclosures.', 'Independent public records survey.']);
      ctx.insertHtml(`${html}<p><br></p>`);
    },
  },
  {
    id: 'insert.factBox',
    title: 'Fact Box & Key Findings',
    category: 'insert',
    icon: 'BarChart2',
    description: 'Structured key facts, data bullet points, and analytical takeaways',
    keywords: ['factbox', 'facts', 'findings', 'stats', 'data', 'takeaways', 'bullet', 'box'],
    execute: (ctx) => {
      const html = editorialNodes.createFactBox('Key Facts & Findings');
      ctx.insertHtml(`${html}<p><br></p>`);
    },
  },
  {
    id: 'insert.warning',
    title: 'Warning & Editorial Advisory',
    category: 'insert',
    icon: 'AlertTriangle',
    description: 'Urgent notice, developing story advisory, or crucial disclaimer banner',
    keywords: ['warning', 'alert', 'advisory', 'notice', 'disclaimer', 'caution', 'urgent'],
    execute: (ctx) => {
      const html = editorialNodes.createWarning('Urgent Editorial Notice');
      ctx.insertHtml(`${html}<p><br></p>`);
    },
  },
  {
    id: 'insert.timeline',
    title: 'Chronological Timeline',
    category: 'insert',
    icon: 'Clock',
    description: 'Chronological sequence of investigative milestones or events',
    keywords: ['timeline', 'chronology', 'milestones', 'events', 'history', 'sequence', 'time'],
    execute: (ctx) => {
      const html = editorialNodes.createTimeline('Chronological Timeline');
      ctx.insertHtml(`${html}<p><br></p>`);
    },
  },
  {
    id: 'insert.relatedStories',
    title: 'Related Stories & Coverage',
    category: 'insert',
    icon: 'Newspaper',
    description: 'Curated related dispatch cards and cross-article links',
    keywords: ['related', 'stories', 'coverage', 'articles', 'links', 'cards', 'recommendations'],
    execute: (ctx) => {
      const html = editorialNodes.createRelatedStories('Related Coverage & In-Depth Dispatches');
      ctx.insertHtml(`${html}<p><br></p>`);
    },
  },
  {
    id: 'insert.citation',
    title: 'Source / Statement Citation',
    category: 'insert',
    icon: 'BookmarkCheck',
    description: 'Attributed statement with verified publication source link',
    keywords: ['citation', 'source', 'attribution', 'statement', 'credit', 'reference'],
    execute: (ctx) => {
      const sel = window.getSelection();
      const text = sel ? sel.toString().trim() : '';
      const html = editorialNodes.createCitation(text || 'Primary source statement corroborated by independent records.', 'Official Gazette Investigative Archive');
      ctx.insertHtml(`${html}<p><br></p>`);
    },
  },
  {
    id: 'insert.asterism',
    title: 'Asterism Section Divider (⁂)',
    category: 'insert',
    icon: 'Minus',
    description: 'Ornate triple-asterisk editorial divider',
    keywords: ['divider', 'asterism', 'ornament', 'break', 'separator', 'line'],
    execute: (ctx) => {
      const html = editorialNodes.createDivider('asterism');
      ctx.insertHtml(`${html}<p><br></p>`);
    },
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
    title: 'Insert Video (Embed & Hosted)',
    category: 'media',
    icon: 'Video',
    description: 'Embed YouTube, Vimeo, Loom, Spotify, or upload secure Gazette MP4/WebM video',
    keywords: ['video', 'youtube', 'vimeo', 'loom', 'spotify', 'mp4', 'webm', 'embed', 'player', 'broadcast'],
    execute: (ctx) => ctx.openModal('videoUpload'),
  },
  {
    id: 'media.document',

    title: 'Import Manuscript (.docx, .pdf, Gutenberg)',
    category: 'media',
    icon: 'FileText',
    description: 'Ingest Word (.docx), PDF, or WordPress Gutenberg blocks',
    keywords: ['import', 'docx', 'pdf', 'word', 'document', 'markdown', 'gutenberg'],
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
    execute: (ctx) => {
      const html = editorialNodes.createCallout('Editor’s Note', 'This dispatch was updated with confirmed findings on database replication latency.', 'editorial');
      ctx.insertHtml(`${html}<p><br></p>`);
    },
  },
  {
    id: 'editorial.correction',
    title: 'Correction / Errata',
    category: 'editorial',
    icon: 'AlertTriangle',
    description: 'Formal transparent correction notice block with timestamp',
    keywords: ['correction', 'errata', 'amendment', 'notice'],
    execute: (ctx) => {
      const html = editorialNodes.createCorrection('An earlier version of this story referenced legacy connection strings. The parameters have been updated.');
      ctx.insertHtml(`${html}<p><br></p>`);
    },
  },
  {
    id: 'editorial.delete',
    title: 'Delete Current Block / Media Node',
    category: 'editorial',
    shortcut: 'Delete',
    icon: 'Trash2',
    description: 'Delete the selected video, media, embed, table, or active paragraph',
    keywords: ['delete', 'remove', 'trash', 'clear', 'video', 'media', 'embed', 'cut', 'erase'],
    execute: (ctx) => {
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        const node = sel.anchorNode;
        const block = (node instanceof HTMLElement ? node : node?.parentElement)?.closest<HTMLElement>(
          'figure, details, table, blockquote, img, p, div'
        );
        if (block && ctx.editorRef?.current?.contains(block) && block !== ctx.editorRef.current) {
          block.remove();
          ctx.editorRef.current?.dispatchEvent(new Event('input', { bubbles: true }));
          return;
        }
      }
      ctx.executeCommand('delete');
    },
  },

  // ─── VIEW & REVIEW CATEGORY ───────────────────────────────────────────────
  {
    id: 'view.documentMap',
    title: 'Document Map / Outline',
    category: 'view',
    shortcut: 'Ctrl+Shift+O',
    icon: 'PanelRight',
    description: 'Interactive section tree and outline navigator',
    keywords: ['document map', 'outline', 'toc', 'navigator', 'structure'],
    execute: (ctx) => {
      if (ctx.showOutline) ctx.showOutline();
    },
  },
  {
    id: 'view.inspector',
    title: 'Metadata Inspector',
    category: 'view',
    shortcut: 'Ctrl+Shift+I',
    icon: 'PanelRight',
    description: 'Toggle right-side article metadata & SEO inspector panel',
    keywords: ['inspector', 'sidebar', 'metadata', 'seo', 'details'],
    execute: (ctx) => {
      if (ctx.toggleInspector) ctx.toggleInspector();
    },
  },
];
