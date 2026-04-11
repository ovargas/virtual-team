import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, existsSync, statSync } from 'fs';
import { join } from 'path';

const ROOT = join(import.meta.dirname, '..');
const CLAUDE_DIR = join(ROOT, '.claude');

function collectMdFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      files.push(...collectMdFiles(full));
    } else if (entry.endsWith('.md')) {
      files.push(full);
    }
  }
  return files;
}

/**
 * Extract file path references from markdown content.
 * Matches patterns like:
 *   .claude/agents/implementer.md
 *   .claude/skills/tdd-iron-law/SKILL.md
 *   docs/backlog.md
 *
 * Excludes:
 *   - URLs (http://, https://)
 *   - Git URLs (git+https://)
 *   - Patterns with placeholders ({slug}, {item-id})
 *   - Date-prefixed plan references (docs/plans/2026-...)
 *   - Paths inside code blocks
 */
function extractFileRefs(content: string): string[] {
  // Remove code blocks to avoid false positives from examples
  const withoutCodeBlocks = content.replace(/```[\s\S]*?```/g, '');

  const refs: string[] = [];
  // Match .claude/ and docs/ paths that end with .md, .json, .yaml, .yml
  const pattern = /(?:\.claude|docs)\/[\w./-]+\.(?:md|json|yaml|yml)/g;
  let match;

  while ((match = pattern.exec(withoutCodeBlocks)) !== null) {
    const ref = match[0];
    // Skip patterns with template placeholders
    if (ref.includes('{') || ref.includes('}')) continue;
    // Skip template/example paths (YYYY-MM-DD, FEAT-NNN, FEAT-003, etc.)
    if (/YYYY|NNN|HHMMSS/.test(ref)) continue;
    if (/FEAT-\d+/.test(ref)) continue;
    if (/BUG-\d+/.test(ref)) continue;
    // Skip date-prefixed plan files (project-specific, not part of the plugin)
    if (/docs\/plans\/\d{4}-/.test(ref)) continue;
    // Skip date-prefixed feature files
    if (/docs\/features\/\d{4}-/.test(ref)) continue;
    // Skip date-prefixed review files
    if (/docs\/reviews\/\d{4}-/.test(ref)) continue;
    // Skip checkpoint files (runtime-generated)
    if (/docs\/checkpoints\//.test(ref)) continue;
    // Skip knowledge files (runtime-generated)
    if (/docs\/knowledge\//.test(ref)) continue;
    // Skip runtime-generated files (settings.local.json, backlog-index, etc.)
    if (/settings\.local\.json/.test(ref)) continue;
    // Skip docs subdirectories that are created at runtime
    if (/docs\/(bugs|decisions|documentation|handoffs|proposals|research|validations)\//.test(ref)) continue;
    // Skip backlog helper files (created by external backlog skill)
    if (/docs\/backlog-(index|archive)\.md/.test(ref)) continue;
    refs.push(ref);
  }

  return [...new Set(refs)];
}

describe('file path references in .claude/', () => {
  const allFiles = collectMdFiles(CLAUDE_DIR);

  for (const file of allFiles) {
    const relativePath = file.replace(ROOT + '/', '');
    const content = readFileSync(file, 'utf-8');
    const refs = extractFileRefs(content);

    if (refs.length === 0) continue;

    describe(relativePath, () => {
      it.each(refs)('reference %s resolves to an existing file', (ref) => {
        const fullPath = join(ROOT, ref);
        expect(
          existsSync(fullPath),
          `${relativePath} references "${ref}" but the file does not exist`
        ).toBe(true);
      });
    });
  }
});

describe('required project directories exist', () => {
  const requiredDirs = ['docs'];

  it.each(requiredDirs)('%s directory exists', (dir) => {
    const fullPath = join(ROOT, dir);
    expect(existsSync(fullPath), `Required directory "${dir}" does not exist`).toBe(true);
  });
});
