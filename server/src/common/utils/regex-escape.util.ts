/**
 * Escapes user-supplied strings before using them as MongoDB $regex patterns
 * or Postgres SIMILAR TO inputs, preventing Regular Expression Denial of Service (ReDoS).
 *
 * OWASP A05:2025 — Security Misconfiguration / NoSQL Injection.
 *
 * All 14 characters that carry special meaning inside JS / PCRE regex literals are escaped.
 */
export function escapeRegex(raw: string | null | undefined): string {
  if (raw == null) return '';
  return String(raw).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
