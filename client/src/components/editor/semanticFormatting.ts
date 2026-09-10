/**
 * CE1: DOM-based semantic formatting engine replacing deprecated
 * `document.execCommand` / `document.queryCommandState`.
 *
 * All formatting flows through Range/DOM manipulation so we never touch the
 * removed/deprecated editing command API surface. State queries for the ribbon
 * and floating toolbar live here too, so active-state polling no longer depends
 * on `queryCommandState`.
 */
import { sanitizeHtml } from '../../utils/sanitize';

export type InlineCommand = 'bold' | 'italic' | 'underline' | 'strikeThrough';

const INLINE_FORMAT_TAGS: Record<InlineCommand, string> = {
  bold: 'B',
  italic: 'I',
  underline: 'U',
  strikeThrough: 'S',
};

const BLOCK_TAGS = new Set([
  'P',
  'DIV',
  'H1',
  'H2',
  'H3',
  'H4',
  'H5',
  'H6',
  'BLOCKQUOTE',
  'PRE',
  'LI',
  'FIGURE',
  'TABLE',
  'ASIDE',
  'SECTION',
]);

const FORMAT_BLOCK_TAGS = new Set(['p', 'pre', 'blockquote', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6']);

const FORMAT_REMOVE_TAGS = new Set(['B', 'STRONG', 'I', 'EM', 'U', 'S', 'STRIKE', 'CODE', 'MARK', 'SPAN', 'SUB', 'SUP']);

function getSelection(editor: HTMLElement): Selection | null {
  const sel = window.getSelection();
  if (!sel || !sel.rangeCount) return null;
  return sel;
}

function getRange(editor: HTMLElement): Range | null {
  return getSelection(editor)?.getRangeAt(0) ?? null;
}

function placeCaretAfter(node: Node): void {
  const sel = window.getSelection();
  if (!sel) return;
  const range = document.createRange();
  if (node.parentNode) {
    range.setStartAfter(node);
    range.collapse(true);
  } else {
    range.selectNodeContents(node);
    range.collapse(false);
  }
  sel.removeAllRanges();
  sel.addRange(range);
}

function placeCaretInside(el: HTMLElement, atStart = true): void {
  const sel = window.getSelection();
  if (!sel) return;
  const range = document.createRange();
  range.selectNodeContents(el);
  range.collapse(atStart);
  sel.removeAllRanges();
  sel.addRange(range);
}

function nearestBlock(node: Node | null, editor: HTMLElement): HTMLElement | null {
  let n: Node | null = node;
  while (n && n !== editor) {
    if (n instanceof HTMLElement) {
      if (n.isContentEditable === false) return null;
      if (BLOCK_TAGS.has(n.tagName)) return n;
    }
    n = n.parentNode;
  }
  return null;
}

function nearestTag(node: Node | null, tag: string, editor: HTMLElement): HTMLElement | null {
  let n: Node | null = node;
  while (n && n !== editor) {
    if (n instanceof HTMLElement && n.tagName === tag && n.isContentEditable !== false) return n;
    n = n.parentNode;
  }
  return null;
}

function unwrapElement(el: HTMLElement): void {
  const parent = el.parentNode;
  if (!parent) return;
  while (el.firstChild) parent.insertBefore(el.firstChild, el);
  parent.removeChild(el);
}

/**
 * Converts a <ul>/<ol> into an ordered run of <p> blocks. Nested lists are
 * recursively flattened; stray whitespace text nodes become their own <p>.
 */
function unwrapList(listEl: HTMLElement): void {
  const parent = listEl.parentNode;
  if (!parent) return;
  const frag = document.createDocumentFragment();
  Array.from(listEl.childNodes).forEach((child) => {
    if (child.nodeType === Node.ELEMENT_NODE && (child as HTMLElement).tagName === 'LI') {
      const li = child as HTMLElement;
      const nested = li.querySelector(':scope > ul, :scope > ol') as HTMLElement | null;
      if (nested) unwrapList(nested);
      const p = document.createElement('p');
      while (li.firstChild) p.appendChild(li.firstChild);
      if (!p.textContent?.trim() && !p.querySelector('img, iframe, video, table')) p.innerHTML = '<br>';
      frag.appendChild(p);
    } else if (child.nodeType === Node.TEXT_NODE && child.textContent?.trim()) {
      const p = document.createElement('p');
      p.appendChild(child);
      frag.appendChild(p);
    }
  });
  parent.insertBefore(frag, listEl);
  parent.removeChild(listEl);
}

export function formatBlock(editor: HTMLElement, requestedTag: string): void {
  const range = getRange(editor);
  if (!range) return;
  const block =
    nearestBlock(range.startContainer, editor) ||
    nearestBlock(range.commonAncestorContainer, editor);
  if (!block) return;

  const wanted = (requestedTag || '').replace(/[<>]/g, '').toLowerCase();
  if (!FORMAT_BLOCK_TAGS.has(wanted)) return;
  if (block.tagName.toLowerCase() === wanted) return;

  if (block.tagName === 'LI') {
    const list = block.parentElement;
    if (list && (list.tagName === 'UL' || list.tagName === 'OL')) {
      const el = document.createElement(wanted);
      while (block.firstChild) el.appendChild(block.firstChild);
      if (el.className) el.className = block.className;
      if (!el.textContent?.trim() && !el.querySelector('img, iframe, video, table')) el.innerHTML = '<br>';
      block.remove();
      if (list.parentNode) list.parentNode.insertBefore(el, list.nextSibling);
      if (!list.querySelector('li')) list.remove();
      placeCaretInside(el, true);
      return;
    }
  }

  const el = document.createElement(wanted);
  if (block.className) el.className = block.className;
  while (block.firstChild) el.appendChild(block.firstChild);
  if (!el.textContent?.trim() && !el.querySelector('img, iframe, video, table')) el.innerHTML = '<br>';
  block.replaceWith(el);
  placeCaretInside(el, true);
}

function wrapRangeInTag(range: Range, tag: string): void {
  const fragment = range.extractContents();
  const wrap = document.createElement(tag);
  wrap.appendChild(fragment);
  range.insertNode(wrap);
  const sel = window.getSelection();
  if (sel) {
    const next = document.createRange();
    next.selectNodeContents(wrap);
    sel.removeAllRanges();
    sel.addRange(next);
  }
}

export function toggleInlineFormat(editor: HTMLElement, command: InlineCommand): void {
  const range = getRange(editor);
  const tag = INLINE_FORMAT_TAGS[command];
  if (!range) return;

  if (range.collapsed) {
    // Collapsed caret: toggle sticky typing state. If the caret already sits
    // inside the format tag, move it outside (continue typing unstyled);
    // otherwise wrap an empty element and park the caret inside it so the next
    // keystrokes inherit the style (Chrome/Safari/Firefox contentEditable).
    const inside = nearestTag(range.startContainer, tag, editor);
    if (inside) {
      placeCaretAfter(inside);
    } else {
      const wrap = document.createElement(tag);
      wrap.innerHTML = '<br>';
      range.deleteContents();
      range.insertNode(wrap);
      if (wrap.textContent === '') placeCaretInside(wrap, true);
      else placeCaretAfter(wrap.childNodes[wrap.childNodes.length - 1]);
    }
    return;
  }

  const startWrap = nearestTag(range.startContainer, tag, editor);
  const endWrap = nearestTag(range.endContainer, tag, editor);
  if (startWrap && startWrap === endWrap) {
    unwrapElement(startWrap);
  } else {
    wrapRangeInTag(range, tag);
  }
}

export function setJustification(editor: HTMLElement, align: 'left' | 'center' | 'right' | 'justify'): void {
  const range = getRange(editor);
  if (!range) return;
  const block =
    nearestBlock(range.startContainer, editor) ||
    nearestBlock(range.commonAncestorContainer, editor);
  if (!block) return;
  if (align === 'left') block.style.removeProperty('text-align');
  else block.style.setProperty('text-align', align);
}

export function toggleList(editor: HTMLElement, type: 'ul' | 'ol'): void {
  const range = getRange(editor);
  if (!range) return;
  const block =
    nearestBlock(range.startContainer, editor) ||
    nearestBlock(range.commonAncestorContainer, editor);
  if (!block) return;

  const listEl = block.closest('ul, ol') as HTMLElement | null;

  if (block.tagName === 'LI' && listEl) {
    if (listEl.tagName.toLowerCase() === type) {
      // Toggle off: flatten the list back into paragraphs.
      const placeAfter = listEl.nextSibling;
      unwrapList(listEl);
      const newBlock = placeAfter ? (placeAfter.previousSibling as HTMLElement | null) : null;
      if (newBlock) placeCaretInside(newBlock, true);
      return;
    }
    // Switch list flavor in place.
    const newList = document.createElement(type);
    while (listEl.firstChild) newList.appendChild(listEl.firstChild);
    listEl.replaceWith(newList);
    const firstLi = newList.querySelector('li');
    if (firstLi) placeCaretInside(firstLi, true);
    return;
  }

  // Non-li block: convert into a list item inside an existing or fresh list.
  const li = document.createElement('li');
  while (block.firstChild) li.appendChild(block.firstChild);
  if (!li.textContent?.trim() && !li.querySelector('img, iframe, video, table')) li.innerHTML = '<br>';
  if (block.className) li.className = block.className;

  if (listEl) {
    block.replaceWith(li);
  } else {
    const newList = document.createElement(type);
    newList.appendChild(li);
    block.replaceWith(newList);
  }
  placeCaretInside(li, true);
}

function collectRangeFormatElements(root: Element, range: Range): HTMLElement[] {
  const result: HTMLElement[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT, {
    acceptNode(node) {
      const el = node as HTMLElement;
      if (!FORMAT_REMOVE_TAGS.has(el.tagName)) return NodeFilter.FILTER_SKIP;
      if (!range.intersectsNode(el)) return NodeFilter.FILTER_SKIP;
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  let current = walker.nextNode();
  while (current) {
    result.push(current as HTMLElement);
    current = walker.nextNode();
  }
  return result;
}

export function removeFormat(editor: HTMLElement): void {
  const range = getRange(editor);
  if (!range || range.collapsed) return;
  const container = range.commonAncestorContainer;
  const root: Element = container instanceof Element ? container : (container.parentElement ?? editor);
  let candidates = collectRangeFormatElements(root, range);
  // Unwrap deepest first so nested wrappers resolve bottom-up.
  candidates = candidates.sort((a, b) => {
    const depthOf = (el: HTMLElement) => {
      let depth = 0;
      let n: Node | null = el;
      while (n && n !== root) {
        depth += 1;
        n = n.parentNode;
      }
      return depth;
    };
    return depthOf(b) - depthOf(a);
  });
  candidates.forEach((el) => {
    if (el.parentNode) unwrapElement(el);
  });
}

export function insertHtmlAtCaret(editor: HTMLElement, html: string): void {
  const sel = window.getSelection();
  const range =
    sel && sel.rangeCount > 0 ? sel.getRangeAt(0) : document.createRange();
  if (range.collapsed === false) range.deleteContents();

  const clean = sanitizeHtml(html || '');
  const template = document.createElement('template');
  template.innerHTML = clean;

  const first = template.content.firstChild;
  if (!first) return;
  range.insertNode(template.content);
  const inserted = first.parentNode;
  if (inserted) placeCaretAfter(inserted.lastChild ?? first);
}

export function createLink(editor: HTMLElement, url: string): void {
  const range = getRange(editor);
  if (!range) return;
  const escaped = url
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  const a = document.createElement('a');
  a.setAttribute('href', escaped);
  a.className = 'text-accent-crimson font-serif underline hover:text-rose-900 transition-colors';

  if (range.collapsed) {
    a.appendChild(document.createTextNode(url));
    range.insertNode(a);
    placeCaretAfter(a);
  } else {
    const fragment = range.extractContents();
    a.appendChild(fragment);
    range.insertNode(a);
    const sel = window.getSelection();
    if (sel) {
      const next = document.createRange();
      next.selectNodeContents(a);
      sel.removeAllRanges();
      sel.addRange(next);
    }
  }
}

export function unlink(editor: HTMLElement): void {
  const sel = getSelection(editor);
  if (!sel || (!sel.anchorNode && !sel.focusNode)) return;
  const anchor = sel.anchorNode ? nearestTag(sel.anchorNode, 'A', editor) : null;
  const focus = sel.focusNode ? nearestTag(sel.focusNode, 'A', editor) : null;
  const targets = new Set<HTMLElement>();
  if (anchor) targets.add(anchor);
  if (focus && focus !== anchor) targets.add(focus);
  targets.forEach((a) => unwrapElement(a));
  if (anchor) placeCaretAfter(anchor);
}

export function insertImageAtCaret(editor: HTMLElement, url: string): void {
  const range = getRange(editor) || document.createRange();
  const p = document.createElement('p');
  const img = document.createElement('img');
  img.setAttribute('src', url);
  img.setAttribute('alt', '');
  img.className = 'cms-editor-image w-full h-auto my-2';
  p.appendChild(img);
  range.deleteContents();
  range.insertNode(p);
  placeCaretAfter(p);
}

export function deleteSelection(): boolean {
  const sel = window.getSelection();
  if (!sel || sel.isCollapsed) return false;
  sel.deleteFromDocument();
  return true;
}

export function queryInlineFormat(editor: HTMLElement, command: InlineCommand): boolean {
  const sel = getSelection(editor);
  if (!sel || !sel.anchorNode) return false;
  return !!nearestTag(sel.anchorNode, INLINE_FORMAT_TAGS[command], editor);
}

export function queryListState(editor: HTMLElement, type: 'ul' | 'ol'): boolean {
  const sel = getSelection(editor);
  if (!sel || !sel.anchorNode) return false;
  let n: Node | null = sel.anchorNode;
  while (n && n !== editor) {
    if (n instanceof HTMLElement && n.tagName.toLowerCase() === type) return true;
    n = n.parentNode;
  }
  return false;
}

export function queryAlignState(
  editor: HTMLElement,
): 'left' | 'center' | 'right' | 'justify' {
  const sel = getSelection(editor);
  if (!sel || !sel.anchorNode) return 'left';
  const block = nearestBlock(sel.anchorNode, editor);
  if (!block) return 'left';
  const inline = block.style.textAlign;
  if (inline === 'center' || inline === 'right' || inline === 'justify') return inline;
  try {
    const computed = window.getComputedStyle(block).textAlign;
    if (computed === 'center' || computed === 'right' || computed === 'justify') return computed;
  } catch {
    // fall through
  }
  return 'left';
}

// Maps from actual DOM tag to the ribbon <select> value vocabulary
// (p | h2 | h3 | h4 | blockquote | pre).
export function queryBlockType(editor: HTMLElement): string {
  const sel = getSelection(editor);
  if (!sel || !sel.anchorNode) return 'p';
  const block = nearestBlock(sel.anchorNode, editor);
  if (!block) return 'p';
  switch (block.tagName) {
    case 'H1':
      return 'h2';
    case 'H2':
      return 'h3';
    case 'H3':
      return 'h4';
    case 'BLOCKQUOTE':
      return 'blockquote';
    case 'PRE':
      return 'pre';
    default:
      return 'p';
  }
}

export function executeFormatCommand(editor: HTMLElement, command: string, valueArg?: string): void {
  switch (command) {
    case 'bold':
    case 'italic':
    case 'underline':
    case 'strikeThrough': {
      toggleInlineFormat(editor, command);
      break;
    }
    case 'formatBlock':
      formatBlock(editor, valueArg || '<p>');
      break;
    case 'justifyLeft':
      setJustification(editor, 'left');
      break;
    case 'justifyCenter':
      setJustification(editor, 'center');
      break;
    case 'justifyRight':
      setJustification(editor, 'right');
      break;
    case 'justifyFull':
      setJustification(editor, 'justify');
      break;
    case 'insertOrderedList':
      toggleList(editor, 'ol');
      break;
    case 'insertUnorderedList':
      toggleList(editor, 'ul');
      break;
    case 'removeFormat':
      removeFormat(editor);
      break;
    case 'insertHTML':
      insertHtmlAtCaret(editor, valueArg || '');
      break;
    case 'createLink':
      createLink(editor, valueArg || '');
      break;
    case 'unlink':
      unlink(editor);
      break;
    case 'insertImage':
      insertImageAtCaret(editor, valueArg || '');
      break;
    case 'delete':
      deleteSelection();
      break;
    default:
      break;
  }
}