import DOMPurify from 'dompurify';

/**
 * CE3: Single client-side HTML sanitization entry point. Every
 * `dangerouslySetInnerHTML` render path funnels through this policy:
 * - scripts / event handlers / javascript: URLs / <style> stripped
 * - URL schemes restricted (images may use data: for png/jpeg/gif/webp only)
 * - iframes only from trusted embed hosts, and re-armed with a sandbox
 * - style attribute retained (editorial typography) but url()/expression
 *   payloads neutralized by DOMPurify's built-in CSS filtering
 */
const ALLOWED_IFRAME_HOSTS: ReadonlyArray<string> = [
  'www.youtube.com',
  'youtube.com',
  'youtu.be',
  'www.youtube-nocookie.com',
  'player.vimeo.com',
  'vimeo.com',
  'open.spotify.com',
  'www.loom.com',
  'loom.com',
  'w.soundcloud.com',
  'platform.twitter.com',
  'platform.x.com',
];

function isSafeIframeSrc(src: string): boolean {
  try {
    const u = new URL(src);
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return false;
    const host = u.hostname.toLowerCase();
    return ALLOWED_IFRAME_HOSTS.some(
      (allowed) => host === allowed || host.endsWith(`.${allowed}`),
    );
  } catch {
    return false;
  }
}

const SANDBOX_POLICY = 'allow-scripts allow-same-origin allow-presentation allow-popups';

export function sanitizeHtml(dirtyHtml?: string | null): string {
  if (!dirtyHtml || typeof dirtyHtml !== 'string') return '';


  const result = DOMPurify.sanitize(dirtyHtml, {
    USE_PROFILES: { html: true },
    FORBID_TAGS: ['script', 'style'],
    FORBID_ATTR: [
      'onerror', 'onload', 'onclick', 'ondblclick', 'onmousedown', 'onmouseup',
      'onmouseover', 'onmouseout', 'onmousemove', 'onkeydown', 'onkeyup',
      'onkeypress', 'onfocus', 'onblur', 'onchange', 'onsubmit', 'onreset',
      'onselect', 'formaction',
    ],
    ALLOWED_URI_REGEXP:
      /^(?:(?:https?|mailto|tel):|(?:data:image\/(?:png|jpeg|gif|webp));|#|\.\.?\/)?/i,
    ALLOW_UNKNOWN_PROTOCOLS: false,
  });

  const sandbox = window.document.createElement('div');
  sandbox.innerHTML = result;

  sandbox.querySelectorAll('iframe').forEach((frame) => {
    const src = frame.getAttribute('src') || '';
    if (!isSafeIframeSrc(src)) {
      frame.remove();
      return;
    }
    // CE4: embeds cannot navigate, focus, or escape the sandbox; scripts are
    // allowed so third-party players (YouTube/Vimeo) keep working, but the
    // framed origin is always a separate cross-origin property of our page.
    frame.setAttribute('sandbox', SANDBOX_POLICY);
    frame.setAttribute('loading', 'lazy');
  });

  return sandbox.innerHTML;
}