import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, dirname, resolve, normalize, sep } from 'node:path';

const ROOTS = {
  server: resolve('server/src'),
  client: resolve('client/src'),
};

function walk(dir, acc = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      walk(full, acc);
    } else if (/\.(ts|tsx|mjs|js|jsx)$/.test(entry)) {
      acc.push(full);
    }
  }
  return acc;
}

function isExternal(spec) {
  return !spec.startsWith('.') && !spec.startsWith('/');
}

function resolveCandidate(baseDir, spec) {
  const candidates = [
    spec,
    `${spec}.ts`,
    `${spec}.tsx`,
    `${spec}.mjs`,
    `${spec}.js`,
    `${spec}/index.ts`,
    `${spec}/index.tsx`,
    `${spec}/index.js`,
  ];
  for (const c of candidates) {
    const p = normalize(resolve(baseDir, c));
    if (existsSync(p)) return p;
  }
  return null;
}

let problems = 0;
const files = [];
files.push(...walk(ROOTS.server));
files.push(...walk(ROOTS.client));

for (const file of files) {
  const dir = dirname(file);
  const content = readFileSync(file, 'utf8');
  const importRe = /(?:import|export)\s+(?:[^'"]*?\s+from\s+)?['"]([^'"]+)['"]/g;
  let match;
  while ((match = importRe.exec(content)) !== null) {
    const spec = match[1];
    if (isExternal(spec)) continue;
    if (!resolveCandidate(dir, spec)) {
      problems++;
      console.log(`MISSING ${file.replace(/\\/g, '/')} -> "${spec}"`);
    }
  }
}

console.log(problems === 0 ? `All relative imports resolve (${files.length} files scanned).` : `${problems} broken link(s) found.`);
process.exit(problems === 0 ? 0 : 1);