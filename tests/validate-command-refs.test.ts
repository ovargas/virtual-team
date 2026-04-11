import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';

const ROOT = join(import.meta.dirname, '..');
const CLAUDE_DIR = join(ROOT, '.claude');
const COMMANDS_DIR = join(CLAUDE_DIR, 'commands');

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

/** Get all known command names from .claude/commands/ */
function getCommandNames(): Set<string> {
  return new Set(
    readdirSync(COMMANDS_DIR)
      .filter(f => f.endsWith('.md'))
      .map(f => f.replace('.md', ''))
  );
}

/**
 * Extract /command-name references from markdown content.
 *
 * Matches: /flow, /implement, /review, /validate, /pr, etc.
 * Skips:
 *   - Paths like /Users, /etc, /tmp, /dev
 *   - URLs after http(s)://
 *   - Known non-command patterns like /dev/null, /en/docs
 */
function extractCommandRefs(content: string): string[] {
  const refs: string[] = [];

  // Match /word patterns that look like command invocations
  // Must be preceded by whitespace, backtick, quote, or start of line
  const pattern = /(?:^|[\s`"'(])\/([a-z][\w-]*)/gm;
  let match;

  const skipPrefixes = new Set([
    'Users', 'etc', 'tmp', 'dev', 'var', 'usr', 'home', 'bin',
    'en', 'docs', 'api', 'v1', 'v2', 'v3',
  ]);

  while ((match = pattern.exec(content)) !== null) {
    const name = match[1];
    if (skipPrefixes.has(name)) continue;
    if (name.includes('/')) continue;
    refs.push(name);
  }

  return [...new Set(refs)];
}

describe('command cross-references', () => {
  const commandNames = getCommandNames();
  const allFiles = collectMdFiles(CLAUDE_DIR);

  // Collect all command refs across all files and verify each resolves
  const allRefs: Array<{ file: string; ref: string }> = [];

  for (const file of allFiles) {
    const relativePath = file.replace(ROOT + '/', '');
    const content = readFileSync(file, 'utf-8');
    const refs = extractCommandRefs(content);

    for (const ref of refs) {
      if (!commandNames.has(ref) && !isKnownNonCommand(ref)) {
        allRefs.push({ file: relativePath, ref });
      }
    }
  }

  if (allRefs.length > 0) {
    it.each(allRefs.map(r => [`${r.file} → /${r.ref}`, r]))(
      '%s is a known command',
      (_, { ref }) => {
        expect(
          commandNames.has(ref) || isKnownNonCommand(ref),
          `/${ref} does not match any command in .claude/commands/`
        ).toBe(true);
      }
    );
  } else {
    it('all /command references resolve to known commands', () => {
      expect(allRefs).toEqual([]);
    });
  }
});

describe('command name consistency', () => {
  const commandNames = getCommandNames();

  it('all command names use lowercase-kebab-case', () => {
    for (const name of commandNames) {
      expect(name, `Command "${name}" is not kebab-case`).toMatch(/^[a-z][a-z0-9-]*$/);
    }
  });

  it('no duplicate command names exist', () => {
    const files = readdirSync(COMMANDS_DIR).filter(f => f.endsWith('.md'));
    const names = files.map(f => f.replace('.md', ''));
    const dupes = names.filter((n, i) => names.indexOf(n) !== i);

    expect(dupes, `Duplicate command files: ${dupes.join(', ')}`).toEqual([]);
  });
});

describe('skill directory consistency', () => {
  const skillsDir = join(CLAUDE_DIR, 'skills');
  const skillDirs = readdirSync(skillsDir).filter(
    d => statSync(join(skillsDir, d)).isDirectory()
  );

  it.each(skillDirs)('skill directory %s contains a SKILL.md file', (dir) => {
    const skillFile = join(skillsDir, dir, 'SKILL.md');
    expect(
      statSync(skillFile, { throwIfNoEntry: false })?.isFile(),
      `Skill directory "${dir}" is missing SKILL.md`
    ).toBe(true);
  });
});

/** Known patterns that start with / but aren't commands */
function isKnownNonCommand(ref: string): boolean {
  const nonCommands = new Set([
    'fix', 'ship', 'gsd-next', 'standup',
    // Built-in Claude Code commands (not custom commands)
    'compact', 'help', 'clear', 'config', 'cost', 'doctor',
    'login', 'logout', 'memory', 'model', 'permissions',
    'fast', 'slow',
  ]);
  return nonCommands.has(ref);
}
