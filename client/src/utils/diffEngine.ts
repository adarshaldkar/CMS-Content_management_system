/**
 * The Gazette Semantic Text Diff Engine
 * Computes word-level and paragraph-level diffs between revision snapshots
 * without corrupting underlying document structure.
 */

export type DiffType = 'added' | 'removed' | 'unchanged';

export interface DiffToken {
  type: DiffType;
  value: string;
}

export interface DiffSummary {
  addedWords: number;
  removedWords: number;
  wordCountDelta: number;
  tokens: DiffToken[];
}

/**
 * Strips HTML tags safely to extract semantic plain text
 */
export function extractPlainTextFromHtml(html: string): string {
  if (!html) return '';
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<\/p>|<\/div>|<\/h[1-6]>|<\/li>/gi, '\n\n')
    .replace(/<br\s*[\/]?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .trim();
}

/**
 * Computes Myers-style word-level difference between two text snapshots
 */
export function computeWordDiff(oldText: string, newText: string): DiffSummary {
  const oldWords = oldText.split(/(\s+)/).filter(Boolean);
  const newWords = newText.split(/(\s+)/).filter(Boolean);

  const oldWordCount = oldText.trim() ? oldText.trim().split(/\s+/).length : 0;
  const newWordCount = newText.trim() ? newText.trim().split(/\s+/).length : 0;
  const wordCountDelta = newWordCount - oldWordCount;

  // Simple Longest Common Subsequence (LCS) matrix for clean word diff
  const m = oldWords.length;
  const n = newWords.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (oldWords[i - 1] === newWords[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Backtrack to build tokens
  let i = m;
  let j = n;
  const rawTokens: DiffToken[] = [];
  let addedWords = 0;
  let removedWords = 0;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldWords[i - 1] === newWords[j - 1]) {
      rawTokens.unshift({ type: 'unchanged', value: oldWords[i - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      const val = newWords[j - 1];
      if (val.trim()) addedWords++;
      rawTokens.unshift({ type: 'added', value: val });
      j--;
    } else if (i > 0 && (j === 0 || dp[i][j - 1] < dp[i - 1][j])) {
      const val = oldWords[i - 1];
      if (val.trim()) removedWords++;
      rawTokens.unshift({ type: 'removed', value: val });
      i--;
    }
  }

  // Coalesce sequential tokens of same type
  const tokens: DiffToken[] = [];
  rawTokens.forEach((tok) => {
    if (tokens.length > 0 && tokens[tokens.length - 1].type === tok.type) {
      tokens[tokens.length - 1].value += tok.value;
    } else {
      tokens.push({ ...tok });
    }
  });

  return {
    addedWords,
    removedWords,
    wordCountDelta,
    tokens,
  };
}
