import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';

const ROOT = join(import.meta.dirname, '..');

function parseFrontmatter(content: string): Record<string, string> | null {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;

  const fields: Record<string, string> = {};
  for (const line of match[1].split('\n')) {
    const colonIndex = line.indexOf(':');
    if (colonIndex > 0) {
      const key = line.slice(0, colonIndex).trim();
      const value = line.slice(colonIndex + 1).trim();
      fields[key] = value;
    }
  }
  return fields;
}

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

describe('command frontmatter', () => {
  const commandDir = join(ROOT, 'commands');
  const files = readdirSync(commandDir).filter(f => f.endsWith('.md'));

  it.each(files)('%s has valid frontmatter with name and description', (file) => {
    const content = readFileSync(join(commandDir, file), 'utf-8');
    const fm = parseFrontmatter(content);

    expect(fm, `${file} is missing frontmatter`).not.toBeNull();
    expect(fm!.name, `${file} is missing 'name' field`).toBeTruthy();
    expect(fm!.description, `${file} is missing 'description' field`).toBeTruthy();
  });

  it.each(files)('%s name matches filename', (file) => {
    const content = readFileSync(join(commandDir, file), 'utf-8');
    const fm = parseFrontmatter(content);
    const expectedName = file.replace('.md', '');

    expect(fm!.name).toBe(expectedName);
  });

  it.each(files)('%s has a valid model value', (file) => {
    const content = readFileSync(join(commandDir, file), 'utf-8');
    const fm = parseFrontmatter(content);
    const validModels = ['opus', 'sonnet', 'haiku'];

    if (fm!.model) {
      expect(validModels, `${file} has invalid model '${fm!.model}'`).toContain(fm!.model);
    }
  });
});

describe('skill frontmatter', () => {
  const skillsDir = join(ROOT, 'skills');
  const skillFiles = collectMdFiles(skillsDir).filter(f => f.endsWith('SKILL.md'));

  it.each(skillFiles.map(f => [f.replace(skillsDir + '/', ''), f]))(
    '%s has valid frontmatter with name and description',
    (_, fullPath) => {
      const content = readFileSync(fullPath, 'utf-8');
      const fm = parseFrontmatter(content);

      expect(fm, `missing frontmatter`).not.toBeNull();
      expect(fm!.name, `missing 'name' field`).toBeTruthy();
      expect(fm!.description, `missing 'description' field`).toBeTruthy();
    }
  );
});

describe('agent frontmatter', () => {
  const agentsDir = join(ROOT, 'agents');
  const files = readdirSync(agentsDir).filter(f => f.endsWith('.md'));

  it.each(files)('%s has valid frontmatter with name and description', (file) => {
    const content = readFileSync(join(agentsDir, file), 'utf-8');
    const fm = parseFrontmatter(content);

    expect(fm, `${file} is missing frontmatter`).not.toBeNull();
    expect(fm!.name, `${file} is missing 'name' field`).toBeTruthy();
    expect(fm!.description, `${file} is missing 'description' field`).toBeTruthy();
  });

  it.each(files)('%s name matches filename', (file) => {
    const content = readFileSync(join(agentsDir, file), 'utf-8');
    const fm = parseFrontmatter(content);
    const expectedName = file.replace('.md', '');

    expect(fm!.name).toBe(expectedName);
  });
});

describe('ADR frontmatter', () => {
  const decisionsDir = join(ROOT, 'docs', 'decisions');
  let files: string[] = [];
  try {
    files = readdirSync(decisionsDir).filter(f => f.endsWith('.md'));
  } catch {
    // docs/decisions/ doesn't exist yet — no ADRs to validate
  }

  const validStatuses = ['accepted', 'superseded'];
  const validTypes = ['technical', 'contract', 'convention', 'infrastructure', 'data'];

  it.each(files)('%s has valid ADR frontmatter (id, date, status, type)', (file) => {
    const content = readFileSync(join(decisionsDir, file), 'utf-8');
    const fm = parseFrontmatter(content);

    expect(fm, `${file} is missing frontmatter`).not.toBeNull();
    expect(fm!.id, `${file} is missing 'id' field`).toMatch(/^ADR-\d+$/);
    expect(fm!.date, `${file} is missing 'date' field`).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(validStatuses, `${file} has invalid status '${fm!.status}'`).toContain(fm!.status);
    expect(validTypes, `${file} has invalid type '${fm!.type}'`).toContain(fm!.type);
  });
});

describe('ADR reference integrity', () => {
  const decisionsDir = join(ROOT, 'docs', 'decisions');

  // Build the set of defined ADR IDs from frontmatter in docs/decisions/
  let definedIds = new Set<string>();
  try {
    const files = readdirSync(decisionsDir).filter(f => f.endsWith('.md'));
    for (const file of files) {
      const content = readFileSync(join(decisionsDir, file), 'utf-8');
      const fm = parseFrontmatter(content);
      if (fm?.id) definedIds.add(fm.id);
    }
  } catch {
    // docs/decisions/ doesn't exist — definedIds stays empty
  }

  // Collect every ADR-NNN reference across all markdown files in the repo
  // (excluding node_modules and docs/decisions/ themselves)
  function collectAllMd(dir: string, results: string[] = []): string[] {
    for (const entry of readdirSync(dir)) {
      if (entry === 'node_modules' || entry === '.git') continue;
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) {
        collectAllMd(full, results);
      } else if (entry.endsWith('.md')) {
        results.push(full);
      }
    }
    return results;
  }

  // Strip fenced code blocks (```...```) so example IDs in templates don't
  // count as real references. Inline code (`...`) is preserved — references
  // there are usually genuine.
  function stripCodeFences(content: string): string {
    return content.replace(/```[\s\S]*?```/g, '');
  }

  const allMdFiles = collectAllMd(ROOT);
  const referencingFiles: { file: string; refs: string[] }[] = [];
  for (const file of allMdFiles) {
    if (file.startsWith(decisionsDir)) continue; // ADR files reference themselves
    const content = stripCodeFences(readFileSync(file, 'utf-8'));
    const matches = content.match(/ADR-\d+/g);
    if (matches) {
      const unique = [...new Set(matches)];
      referencingFiles.push({ file: file.replace(ROOT + '/', ''), refs: unique });
    }
  }

  it('every ADR-NNN reference resolves to a defined ADR', () => {
    const dangling: { file: string; ref: string }[] = [];
    for (const { file, refs } of referencingFiles) {
      for (const ref of refs) {
        if (!definedIds.has(ref)) dangling.push({ file, ref });
      }
    }

    expect(
      dangling,
      `Dangling ADR references found:\n${dangling.map(d => `  ${d.file} → ${d.ref}`).join('\n')}`
    ).toEqual([]);
  });
});

describe('out-of-scope frontmatter', () => {
  const oosDir = join(ROOT, 'docs', 'out-of-scope');
  let files: string[] = [];
  try {
    files = readdirSync(oosDir).filter(f => f.endsWith('.md') && f !== 'README.md');
  } catch {
    // docs/out-of-scope/ doesn't exist yet — no OOS records to validate
  }

  const validStatuses = ['deferred', 'rejected', 'superseded'];

  it.each(files)('%s has valid OOS frontmatter (id, date, status)', (file) => {
    const content = readFileSync(join(oosDir, file), 'utf-8');
    const fm = parseFrontmatter(content);

    expect(fm, `${file} is missing frontmatter`).not.toBeNull();
    expect(fm!.id, `${file} is missing 'id' field`).toMatch(/^OOS-\d+$/);
    expect(fm!.date, `${file} is missing 'date' field`).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(validStatuses, `${file} has invalid status '${fm!.status}'`).toContain(fm!.status);
  });
});
