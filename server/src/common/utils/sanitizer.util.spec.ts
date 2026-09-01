import {
  calculateReadingMetrics,
  sanitizeArticleContent,
} from './sanitizer.util';

describe('SanitizerUtil (Server-Side Content Sanitization)', () => {
  it('should strip malicious script tags and inline handlers', () => {
    const maliciousHtml = `
      <h2>Clean Title</h2>
      <p>Clean paragraph text.</p>
      <script>alert("XSS Attack!")</script>
      <img src="https://example.com/pic.jpg" onerror="alert('Image XSS')" />
      <a href="javascript:alert('Link XSS')">Click here</a>
    `;

    const sanitized = sanitizeArticleContent(maliciousHtml);

    expect(sanitized).not.toContain('<script>');
    expect(sanitized).not.toContain('alert("XSS Attack!")');
    expect(sanitized).not.toContain('onerror=');
    expect(sanitized).not.toContain('javascript:');
    expect(sanitized).toContain('<h2>Clean Title</h2>');
    expect(sanitized).toContain('<p>Clean paragraph text.</p>');
    expect(sanitized).toContain('<img src="https://example.com/pic.jpg" />');
  });

  it('should preserve allowed semantic editorial tags and formatting', () => {
    const validHtml = `
      <h2>Heading 2</h2>
      <h3>Heading 3</h3>
      <p>This is <strong>bold</strong>, <em>italic</em>, and <code>inline code</code>.</p>
      <blockquote>A famous quote</blockquote>
      <pre><code>function test() { return true; }</code></pre>
      <ul><li>Item 1</li><li>Item 2</li></ul>
      <a href="https://editorial.org">Editorial Link</a>
    `;

    const sanitized = sanitizeArticleContent(validHtml);

    expect(sanitized).toContain('<h2>Heading 2</h2>');
    expect(sanitized).toContain('<h3>Heading 3</h3>');
    expect(sanitized).toContain('<strong>bold</strong>');
    expect(sanitized).toContain('<em>italic</em>');
    expect(sanitized).toContain('<blockquote>A famous quote</blockquote>');
    expect(sanitized).toContain('rel="noopener noreferrer"');
  });

  it('should compute word count and reading time metrics accurately', () => {
    const sampleText = `
      <h2>Article Overview</h2>
      <p>${'word '.repeat(390)}</p>
    `;

    const metrics = calculateReadingMetrics(sampleText);

    expect(metrics.wordCount).toBe(392);
    // 392 words / 200 wpm = ~2 minutes
    expect(metrics.readingTimeMinutes).toBe(2);
  });
});
